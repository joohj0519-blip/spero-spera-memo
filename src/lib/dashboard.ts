import { getMemo, saveMemo, DASHBOARD_ID } from '../db'
import type { Memo } from '../types'

/* ─────────────────────────────────────────────────────────
   업무 대시보드 데이터
   - 저장은 예약 메모(__dashboard__)의 body(JSON) 에 담아
     기존 메모와 똑같이 Google Drive 로 자동 동기화된다.
   - 업무(카드)의 이름·색·이모지는 아래 AREAS 로 고정,
     사용자가 넣는 링크만 동기화 데이터로 관리한다.
   ───────────────────────────────────────────────────────── */

export type LinkType = 'web' | 'folder' | 'memo' | 'file'
export interface DashLink {
  name: string
  url: string
  type: LinkType
  /** type 이 'file' 일 때만 — 구글 드라이브 앱 전용 공간의 파일 id·종류·크기 */
  fileId?: string
  mime?: string
  size?: number
  /** 첨부파일의 원래 파일 이름. name 에는 '[서식] ' 같은 머릿글이 붙으므로
   *  내려받을 때는 머릿글 없는 이 이름을 쓴다. */
  fileName?: string
}
/** 한 업무의 [링크, 서식, 자료·메모] 세 그룹 */
export type AreaData = [DashLink[], DashLink[], DashLink[]]
export type DashData = Record<string, AreaData>

export interface AreaMeta {
  id: string
  name: string
  emoji: string
  accent: string
  soft: string
}

export const AREAS: AreaMeta[] = [
  { id: 'afterschool', name: '방과후학교',      emoji: '🎒', accent: '#754f4d', soft: '#e7d5d1' },
  { id: 'device',      name: '정보기기',        emoji: '💻', accent: '#3d4463', soft: '#d5d8e4' },
  { id: 'privacy',     name: '개인정보',        emoji: '🔒', accent: '#6e3838', soft: '#e6d2d2' },
  { id: 'homepage',    name: '학교홈페이지',    emoji: '🌐', accent: '#5f7169', soft: '#d8e1dc' },
  { id: 'supplies',    name: '교구·학습준비물', emoji: '✏️', accent: '#947b50', soft: '#ece0c7' },
  { id: 'textbook',    name: '교과서',          emoji: '📚', accent: '#a86f4e', soft: '#ecd9c9' },
  { id: 'library',     name: '학교도서관',      emoji: '📖', accent: '#7b745b', soft: '#e2ddcd' },
  { id: 'disclosure',  name: '정보공시',        emoji: '📋', accent: '#6a6072', soft: '#ded9e2' },
  { id: 'edufee',      name: '교육비지원',      emoji: '💰', accent: '#5c5a38', soft: '#dedcc6' },
  { id: 'etc',         name: '기타',            emoji: '🗂️', accent: '#84796d', soft: '#e2dbd1' },
]

export const GROUP_LABELS = ['링크', '서식', '자료·메모'] as const

/** 파일을 올리면 이름 앞에 자동으로 붙는 머릿글. 빈 칸이면 안 붙는다. */
export const GROUP_TAGS = ['', '서식', '자료'] as const

export function emptyArea(): AreaData {
  return [[], [], []]
}

export async function getDashboard(): Promise<DashData> {
  const m = await getMemo(DASHBOARD_ID)
  if (!m || !m.body) return {}
  try {
    return JSON.parse(m.body) as DashData
  } catch {
    return {}
  }
}

export async function saveDashboard(data: DashData): Promise<void> {
  const now = Date.now()
  const existing = await getMemo(DASHBOARD_ID)
  const memo: Memo = {
    id: DASHBOARD_ID,
    type: 'note',
    title: '__dashboard__',
    body: JSON.stringify(data),
    items: [],
    attachments: [],
    pinned: false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await saveMemo(memo)
}

/** 붙여넣은 주소가 웹 / 내 컴퓨터 폴더 / 메모(주소 없음) 중 무엇인지 판별 */
export function classify(raw: string): { url: string; type: LinkType } {
  const u = (raw || '').trim()
  if (!u) return { url: '', type: 'memo' }
  if (/^https?:\/\//i.test(u)) return { url: u, type: 'web' }
  if (/^file:\/\//i.test(u)) return { url: u, type: 'folder' }
  if (/^[a-zA-Z]:[\\/]/.test(u)) return { url: 'file:///' + u.replace(/\\/g, '/'), type: 'folder' }
  if (/^\\\\/.test(u)) return { url: 'file:' + u.replace(/\\/g, '/'), type: 'folder' }
  if (/^www\./i.test(u)) return { url: 'https://' + u, type: 'web' }
  return { url: '', type: 'memo' }
}

/* ── 첨부파일 ────────────────────────────────────────────────
   실제 파일은 구글 드라이브 앱 전용 공간에 하나씩 따로 올라가고,
   대시보드 목록에는 이름·크기·파일 id 만 남는다. */

/** 개당 크기 한도. 드라이브에 따로 올리므로 메모 첨부(5MB)보다 넉넉하게 잡았다. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024

/** 새 탭에서 그냥 열어도 되는 종류 (나머지는 내려받아서 원래 프로그램으로 연다) */
const VIEWABLE = /^image\/|^application\/pdf$|^text\/plain$/

/** 파일을 드라이브에 올리고 목록에 넣을 항목을 만들어 준다.
 *  tag 를 주면 목록에 보일 이름 앞에 '[서식] ' 처럼 머릿글이 붙고,
 *  label 을 주면 파일 이름 대신 그 이름으로 목록에 올린다
 *  (내려받을 때는 fileName 에 담긴 원래 파일 이름을 쓰므로 영향 없다). */
export async function uploadDashFile(file: File, tag = '', label = ''): Promise<DashLink> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} 은(는) 20MB 를 넘습니다.`)
  }
  const { uploadAppFile } = await import('./drive')
  const fileId = await uploadAppFile(file)
  const base = label.trim() || file.name
  return {
    name: tag ? `[${tag}] ${base}` : base,
    url: '',
    type: 'file',
    fileId,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    fileName: file.name,
  }
}

/** 첨부파일 열기 — 올린 그대로 받아서, 볼 수 있는 종류는 새 탭에, 나머지는 내려받기로. */
export async function openDashFile(link: DashLink): Promise<void> {
  if (!link.fileId) return
  const viewable = VIEWABLE.test(link.mime || '')
  // 내려받기가 끝난 뒤에 창을 열면 팝업 차단에 걸린다 → 누른 즉시 빈 창부터 띄워 둔다
  const win = viewable ? window.open('', '_blank', 'noopener') : null
  try {
    const { downloadAppFile } = await import('./drive')
    const raw = await downloadAppFile(link.fileId)
    // 드라이브가 종류를 안 알려주는 경우가 있어 올릴 때 적어 둔 종류를 다시 씌운다
    const blob = link.mime ? new Blob([raw], { type: link.mime }) : raw
    const url = URL.createObjectURL(blob)
    if (win) {
      win.location.href = url
    } else {
      const a = document.createElement('a')
      a.href = url
      // 머릿글이 붙은 목록 이름 말고 올릴 때의 원래 파일 이름으로 내려받는다
      a.download = link.fileName || link.name
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    // 새 탭이 다 읽을 시간을 준 뒤 정리
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    win?.close()
    throw e
  }
}

/** 목록에서 지울 때 드라이브의 실제 파일도 같이 지운다 (실패해도 목록 삭제는 진행). */
export async function removeDashFile(link: DashLink): Promise<void> {
  if (link.type !== 'file' || !link.fileId) return
  try {
    const { deleteAppFile } = await import('./drive')
    await deleteAppFile(link.fileId)
  } catch {
    /* 드라이브에서 못 지워도 목록에서는 사라지게 둔다 */
  }
}
