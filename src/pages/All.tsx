import { useEffect, useMemo, useState } from 'react'
import { listMemos } from '../db'
import type { Memo, MemoType } from '../types'
import { MEMO_TYPE_META } from '../types'
import { TopBar } from '../components/TopBar'
import { MemoCard } from '../components/MemoCard'
import { SearchIcon } from '../components/Icons'

const FILTERS: Array<{ key: MemoType | 'all'; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'note', label: MEMO_TYPE_META.note.label },
  { key: 'checklist', label: MEMO_TYPE_META.checklist.label },
  { key: 'todo', label: MEMO_TYPE_META.todo.label },
]

export default function All() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [filter, setFilter] = useState<MemoType | 'all'>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    void listMemos().then(setMemos)
  }, [])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? memos : memos.filter((m) => m.type === filter)
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter((m) =>
        [m.title, m.body, ...m.items.map((i) => i.text)].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      )
    }
    return list
  }, [memos, filter, q])

  return (
    <div className="pb-32">
      <TopBar
        title={
          <span className="inline-flex items-baseline gap-2">
            모든 메모
            <span className="text-xs font-normal text-ink-500">총 {memos.length}개</span>
          </span>
        }
        right={
          <button
            onClick={() => {
              setSearchOpen((v) => !v)
              if (searchOpen) setQ('')
            }}
            aria-label="검색"
            className={[
              'w-10 h-10 grid place-items-center rounded-xl border transition-colors',
              searchOpen
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-700 border-slate-200/80 shadow-soft',
            ].join(' ')}
          >
            <SearchIcon />
          </button>
        }
      />

      {searchOpen && (
        <div className="px-5 mb-3">
          <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white shadow-soft border border-slate-200/80">
            <SearchIcon className="text-ink-400" width={18} height={18} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·내용·항목에서 검색"
              className="flex-1 bg-transparent text-sm placeholder:text-ink-400"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="text-ink-400 hover:text-ink-700 text-xs"
                aria-label="지우기"
              >
                ✕
              </button>
            )}
          </label>
        </div>
      )}

      <div className="px-5 grid grid-cols-4 gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'px-2 py-1.5 rounded-xl text-sm whitespace-nowrap border transition-colors text-center',
                active
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-700 border-slate-200/80 shadow-soft',
              ].join(' ')}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="px-5 mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <p className="text-center text-ink-500 py-12">
            {q ? '검색 결과가 없어요.' : '메모가 없어요.'}
          </p>
        ) : (
          filtered.map((m) => <MemoCard key={m.id} memo={m} />)
        )}
      </div>
    </div>
  )
}
