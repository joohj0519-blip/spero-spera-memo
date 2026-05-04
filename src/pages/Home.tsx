import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { listMemos } from '../db'
import type { Memo, MemoType } from '../types'
import { TopBar } from '../components/TopBar'
import { MemoCard } from '../components/MemoCard'
import { NoteIcon, CheckIcon, TargetIcon, SearchIcon, PlusIcon } from '../components/Icons'

const greet = () => {
  const h = new Date().getHours()
  if (h < 6) return '늦은 밤이에요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '좋은 오후예요'
  return '좋은 저녁이에요'
}

const todayLabel = format(new Date(), 'M월 d일 EEEE', { locale: ko })

const categoryClasses: Record<MemoType, { bg: string; text: string }> = {
  note: { bg: 'bg-note-500', text: 'text-white' },
  checklist: { bg: 'bg-check-500', text: 'text-white' },
  todo: { bg: 'bg-todo-500', text: 'text-white' },
}

function CategoryCard({ type, label }: { type: MemoType; label: string }) {
  const Icon = type === 'note' ? NoteIcon : type === 'checklist' ? CheckIcon : TargetIcon
  const c = categoryClasses[type]
  return (
    <Link
      to={`/new?type=${type}`}
      className="flex-1 rounded-2xl bg-white shadow-soft hover:shadow-card transition-shadow border border-white/80 p-3"
    >
      <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} grid place-items-center shadow-soft`}>
        <Icon width={22} height={22} strokeWidth={2} />
      </div>
      <div className="mt-3 text-[11px] text-ink-400 font-medium">오늘</div>
      <div className="mt-0.5 font-bold text-ink-900">{label}</div>
    </Link>
  )
}

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    void listMemos().then(setMemos)
  }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return memos
    const needle = q.trim().toLowerCase()
    return memos.filter((m) =>
      [m.title, m.body, ...m.items.map((i) => i.text)].some((s) =>
        s.toLowerCase().includes(needle),
      ),
    )
  }, [memos, q])

  const pinned = filtered.filter((m) => m.pinned)
  const recent = filtered.filter((m) => !m.pinned).slice(0, 6)

  return (
    <div className="pb-32">
      <TopBar title={greet()} subtitle={todayLabel} />

      <div className="px-5 mt-2">
        <div className="flex gap-3">
          <CategoryCard type="note" label="메모 작성" />
          <CategoryCard type="checklist" label="체크리스트" />
          <CategoryCard type="todo" label="할 일 추가" />
        </div>
      </div>

      <div className="px-5 mt-6">
        <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-soft border border-white/80">
          <SearchIcon className="text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="메모를 검색해보세요..."
            className="flex-1 bg-transparent text-sm placeholder:text-ink-400"
          />
        </label>
      </div>

      {pinned.length > 0 && (
        <section className="px-5 mt-7">
          <h2 className="font-bold text-ink-900 mb-3">고정한 메모</h2>
          <div className="space-y-2.5">
            {pinned.map((m) => (
              <MemoCard key={m.id} memo={m} />
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink-900">최근 메모</h2>
          {memos.length > 6 && (
            <Link to="/all" className="text-xs text-ink-500 hover:text-ink-700">
              전체 보기
            </Link>
          )}
        </div>

        {memos.length === 0 ? (
          <EmptyState />
        ) : recent.length === 0 ? (
          <p className="text-sm text-ink-500 px-1">검색 결과가 없어요.</p>
        ) : (
          <div className="space-y-2.5">
            {recent.map((m) => (
              <MemoCard key={m.id} memo={m} />
            ))}
          </div>
        )}
      </section>

      <Link
        to="/new"
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-ink-900 text-white grid place-items-center shadow-card hover:scale-105 transition-transform"
        aria-label="새 메모"
      >
        <PlusIcon width={26} height={26} strokeWidth={2.2} />
      </Link>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white/70 border border-white/80 shadow-soft p-8 text-center">
      <div className="text-4xl mb-2">🌤️</div>
      <p className="font-semibold text-ink-900">아직 메모가 없어요</p>
      <p className="mt-1 text-sm text-ink-500">
        오늘의 생각, 할 일, 체크리스트를 가볍게 적어보세요.
      </p>
      <Link
        to="/new"
        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-medium shadow-soft"
      >
        <PlusIcon width={16} height={16} strokeWidth={2.4} />
        새 메모 만들기
      </Link>
    </div>
  )
}
