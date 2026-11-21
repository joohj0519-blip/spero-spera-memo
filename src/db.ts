import { get, set, del, keys } from 'idb-keyval'
import type { Memo } from './types'

const PREFIX = 'memo:'
const memoKey = (id: string) => `${PREFIX}${id}`

export const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

function triggerPush() {
  // 순환 import 방지를 위해 동적 로드
  import('./lib/sync')
    .then(({ requestPush, emitMemosChanged }) => {
      // 로컬 변경 즉시 화면 반영 (알림 배너·목록이 완료/삭제 상태를 바로 다시 읽음)
      emitMemosChanged()
      requestPush()
    })
    .catch(() => { /* sync 모듈 미사용 환경에서는 무시 */ })
}

/**
 * 예전 '업무 대시보드' 설정이 담겨 있던 예약 메모 id.
 * 대시보드 화면은 삭제했지만, 이미 기기·Drive 에 저장된 이 데이터가
 * 메모 목록에 이상한 메모로 튀어나오지 않도록 숨김 처리는 그대로 둔다.
 */
export const DASHBOARD_ID = '__dashboard__'

export async function listMemos(): Promise<Memo[]> {
  const allKeys = await keys()
  const memoKeys = allKeys.filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX))
  const memos = await Promise.all(memoKeys.map((k) => get<Memo>(k)))
  return memos
    .filter((m): m is Memo => !!m)
    .sort((a, b) => {
      // 1순위: 완료된 것은 맨 아래로 — 메모가 많아져도 지금 해야 할 것이 위쪽에 보이도록.
      //        (지우지 않고 아래에 남겨 두어, 끝낸 일도 필요하면 다시 찾아볼 수 있게)
      const ca = isCompleted(a)
      const cb = isCompleted(b)
      if (ca !== cb) return ca ? 1 : -1
      // 2순위: 고정한 메모 먼저, 3순위: 최근에 수정한 순
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
}

/**
 * '완료' 판정 — 목록에서 아래로 내릴지 결정하는 기준.
 * - 할 일: 완료 체크됨
 * - 체크리스트: 항목이 1개 이상이고 전부 체크됨 (빈 체크리스트는 아직 작성 중으로 봄)
 * - 일반 메모: 완료 개념이 없으므로 항상 미완료 취급
 */
export function isCompleted(memo: Memo): boolean {
  if (memo.type === 'todo') return !!memo.done
  if (memo.type === 'checklist') return memo.items.length > 0 && memo.items.every((i) => i.checked)
  return false
}

/** 화면 목록용 — 예전 대시보드 예약 메모를 제외한 실제 메모만. (동기화는 listMemos 를 그대로 사용) */
export async function listVisibleMemos(): Promise<Memo[]> {
  return (await listMemos()).filter((m) => m.id !== DASHBOARD_ID)
}

export async function getMemo(id: string): Promise<Memo | undefined> {
  return get<Memo>(memoKey(id))
}

export async function saveMemo(memo: Memo): Promise<void> {
  await set(memoKey(memo.id), memo)
  triggerPush()
}

export async function deleteMemo(id: string): Promise<void> {
  await del(memoKey(id))
  // 동기화용 묘비석 (Drive 와 머지할 때 삭제됐음을 알림)
  try {
    const { markDeleted } = await import('./lib/drive')
    markDeleted(id)
  } catch {
    /* drive lib 미사용 시 무시 */
  }
  triggerPush()
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
