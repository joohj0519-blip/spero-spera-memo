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

/** 대시보드 설정을 담아 두는 예약 메모 id (메모 목록에는 노출하지 않음). */
export const DASHBOARD_ID = '__dashboard__'

export async function listMemos(): Promise<Memo[]> {
  const allKeys = await keys()
  const memoKeys = allKeys.filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX))
  const memos = await Promise.all(memoKeys.map((k) => get<Memo>(k)))
  return memos
    .filter((m): m is Memo => !!m)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
}

/** 화면 목록용 — 대시보드 예약 메모를 제외한 실제 메모만. (동기화는 listMemos 를 그대로 사용) */
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
