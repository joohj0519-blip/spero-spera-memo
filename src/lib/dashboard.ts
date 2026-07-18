import { getMemo, saveMemo, DASHBOARD_ID } from '../db'
import type { Memo } from '../types'

/* ─────────────────────────────────────────────────────────
   업무 대시보드 데이터
   - 저장은 예약 메모(__dashboard__)의 body(JSON) 에 담아
     기존 메모와 똑같이 Google Drive 로 자동 동기화된다.
   - 업무(카드)의 이름·색·이모지는 아래 AREAS 로 고정,
     사용자가 넣는 링크만 동기화 데이터로 관리한다.
   ───────────────────────────────────────────────────────── */

export type LinkType = 'web' | 'folder' | 'memo'
export interface DashLink { name: string; url: string; type: LinkType }
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
