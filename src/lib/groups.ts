import { listMemos, saveMemo } from '../db'
import type { Memo } from '../types'

/* ─────────────────────────────────────────────────────────
   그룹(꼬리표)
   - 메모 하나에 그룹을 여러 개 붙일 수 있다. (memo.groups = ['업무', '방과후'])
   - 그룹 목록을 따로 저장하지 않고 '메모들에 붙어 있는 이름을 모아서' 만든다.
     → 저장할 곳이 메모 하나뿐이라 Google Drive 동기화가 그대로 따라오고,
       목록과 메모가 서로 어긋날 일이 없다. (대신 아무 메모에도 안 붙은 그룹은 목록에서 사라진다)
   ───────────────────────────────────────────────────────── */

/** 그룹 이름 다듬기: 앞뒤 공백·맨 앞 '#' 제거, 너무 긴 이름은 20자로 자름 */
export function cleanGroupName(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().slice(0, 20)
}

export function memoGroups(memo: Memo): string[] {
  return memo.groups ?? []
}

export interface GroupInfo { name: string; count: number }

/** 메모들에 쓰인 그룹과 개수. 많이 쓴 그룹이 앞에, 같으면 가나다순 */
export function collectGroups(memos: Memo[]): GroupInfo[] {
  const map = new Map<string, number>()
  for (const m of memos) {
    for (const g of memoGroups(m)) map.set(g, (map.get(g) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
}

/**
 * 그룹 이름 바꾸기 / 지우기 — 그 그룹이 붙은 모든 메모를 고쳐 저장한다.
 * updatedAt 을 갱신하는 이유: 동기화가 '더 최근에 수정된 쪽'을 채택하므로, 갱신해야 다른 기기에도 반영된다.
 * next 가 null 이면 그룹을 떼어 내기만 한다(메모 자체는 지우지 않음).
 */
async function replaceGroup(name: string, next: string | null): Promise<number> {
  const all = await listMemos()
  let changed = 0
  for (const m of all) {
    const gs = memoGroups(m)
    if (!gs.includes(name)) continue
    // 이름을 바꾼 결과가 이미 붙어 있던 다른 그룹과 같아질 수 있으므로 중복을 없앤다
    const replaced = gs.flatMap((g) => (g === name ? (next ? [next] : []) : [g]))
    await saveMemo({ ...m, groups: [...new Set(replaced)], updatedAt: Date.now() })
    changed++
  }
  return changed
}

export const renameGroup = (name: string, next: string) => replaceGroup(name, next)
export const removeGroup = (name: string) => replaceGroup(name, null)
