import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { listVisibleMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
import type { Memo } from '../types'
import { TopBar } from '../components/TopBar'
import { MemoCard } from '../components/MemoCard'

export default function CalendarView() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')

  useEffect(() => {
    const reload = () => { void listVisibleMemos().then(setMemos) }
    reload()
    return onMemosChanged(reload)
  }, [])

  const weeks = useMemo(() => {
    if (view === 'week') {
      const base = selected ?? new Date()
      const start = startOfWeek(base, { weekStartsOn: 0 })
      return [Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 24 * 3600 * 1000))]
    }
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    const days: Date[] = []
    for (let d = start; d <= end; d = new Date(d.getTime() + 24 * 3600 * 1000)) {
      days.push(d)
    }
    const w: Date[][] = []
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7))
    return w
  }, [view, month, selected])

  // 이전/다음: 월 보기는 한 달씩, 주 보기는 한 주씩 이동
  const go = (dir: number) => {
    if (view === 'week') {
      const base = selected ?? new Date()
      const nb = new Date(base.getTime() + dir * 7 * 24 * 3600 * 1000)
      setSelected(nb)
      setMonth(nb)
    } else {
      setMonth(addMonths(month, dir))
    }
  }

  const memosByDate = useMemo(() => {
    const map = new Map<string, Memo[]>()
    for (const m of memos) {
      if (!m.dueDate) continue
      const key = m.dueDate
      const arr = map.get(key) ?? []
      arr.push(m)
      map.set(key, arr)
    }
    return map
  }, [memos])

  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : ''
  const dayMemos = selected ? memosByDate.get(selectedKey) ?? [] : []

  return (
    <div className="pb-32">
      <TopBar title={format(month, 'yyyy년 M월', { locale: ko })} subtitle="캘린더" />

      <div className="px-5">
        <div className="rounded-xl bg-white shadow-soft border border-ink-200/80 p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={() => go(-1)}
              className="px-2 py-1 text-ink-500 hover:text-ink-900"
            >
              ‹
            </button>
            <div className="flex items-center gap-1">
              <div className="flex rounded-lg bg-ink-100/70 p-0.5">
                {(['month', 'week'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={[
                      'px-2.5 py-1 rounded-md text-xs transition-colors',
                      view === v ? 'bg-white shadow-soft text-ink-900 font-semibold' : 'text-ink-500',
                    ].join(' ')}
                  >
                    {v === 'month' ? '월' : '주'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setMonth(new Date())
                  setSelected(new Date())
                }}
                className="text-xs text-ink-500 px-2 py-1 rounded-lg hover:bg-ink-900/5"
              >
                오늘
              </button>
            </div>
            <button
              onClick={() => go(1)}
              className="px-2 py-1 text-ink-500 hover:text-ink-900"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-ink-400 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div
                key={d}
                className={i === 0 ? 'text-check-600' : i === 6 ? 'text-todo-600' : ''}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {weeks.flat().map((d) => {
              const key = format(d, 'yyyy-MM-dd')
              const dim = view === 'month' && !isSameMonth(d, month)
              const isSelected = selected && isSameDay(d, selected)
              const isToday = isSameDay(d, new Date())
              const has = memosByDate.has(key)
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className={[
                    'aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative',
                    dim && 'text-ink-400/60',
                    !dim && !isSelected && 'text-ink-900 hover:bg-ink-900/5',
                    isSelected && 'bg-ink-900 text-white font-semibold',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span>{format(d, 'd')}</span>
                  {has && (
                    <span
                      className={[
                        'absolute bottom-1.5 w-1 h-1 rounded-full',
                        isSelected ? 'bg-white' : 'bg-todo-500',
                      ].join(' ')}
                    />
                  )}
                  {isToday && !isSelected && (
                    <span className="absolute inset-0 rounded-lg ring-1 ring-ink-900/20 pointer-events-none" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <section className="px-5 mt-5">
        <h2 className="font-semibold text-ink-900 mb-3">
          {selected ? format(selected, 'M월 d일 EEEE', { locale: ko }) : '날짜 선택'}
        </h2>
        {dayMemos.length === 0 ? (
          <p className="text-sm text-ink-500">이 날짜에 등록된 메모가 없어요.</p>
        ) : (
          <div className="space-y-2.5">
            {dayMemos.map((m) => (
              <MemoCard key={m.id} memo={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
