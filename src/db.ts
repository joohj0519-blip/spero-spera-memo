import { get, set, del, keys } from 'idb-keyval'
import type { Memo } from './types'

const PREFIX = 'memo:'
const memoKey = (id: string) => `${PREFIX}${id}`

export const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

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

export async function getMemo(id: string): Promise<Memo | undefined> {
  return get<Memo>(memoKey(id))
}

export async function saveMemo(memo: Memo): Promise<void> {
  await set(memoKey(memo.id), memo)
}

export async function deleteMemo(id: string): Promise<void> {
  await del(memoKey(id))
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
