import { useEffect, useMemo, useState } from 'react'
import { listMemos } from '../db'
import type { Memo, MemoType } from '../types'
import { MEMO_TYPE_META } from '../types'
import { TopBar } from '../components/TopBar'
import { MemoCard } from '../components/MemoCard'

const FILTERS: Array<{ key: MemoType | 'all'; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'note', label: MEMO_TYPE_META.note.label },
  { key: 'checklist', label: MEMO_TYPE_META.checklist.label },
  { key: 'todo', label: MEMO_TYPE_META.todo.label },
]

export default function All() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [filter, setFilter] = useState<MemoType | 'all'>('all')

  useEffect(() => {
    void listMemos().then(setMemos)
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? memos : memos.filter((m) => m.type === filter)),
    [memos, filter],
  )

  return (
    <div className="pb-32">
      <TopBar title="모든 메모" subtitle={`총 ${memos.length}개`} />

      <div className="px-5 flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors',
                active
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-700 border-white shadow-soft',
              ].join(' ')}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="px-5 mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <p className="text-center text-ink-500 py-12">메모가 없어요.</p>
        ) : (
          filtered.map((m) => <MemoCard key={m.id} memo={m} />)
        )}
      </div>
    </div>
  )
}
