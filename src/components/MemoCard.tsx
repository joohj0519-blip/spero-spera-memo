import { Link } from 'react-router-dom'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Memo, MemoType } from '../types'
import { MEMO_TYPE_META } from '../types'
import { PaperclipIcon } from './Icons'

function dueLabel(d?: string) {
  if (!d) return null
  const date = parseISO(d)
  if (isToday(date)) return '오늘'
  if (isTomorrow(date)) return '내일'
  if (isYesterday(date)) return '어제'
  return format(date, 'M월 d일 (eee)', { locale: ko })
}

const palette: Record<MemoType, {
  card: string
  iconBg: string
  iconRing: string
  bar: string
  barTrack: string
  emoji: string
}> = {
  note: {
    card: 'bg-emerald-50/80',
    iconBg: 'bg-emerald-200',
    iconRing: 'ring-emerald-300/60',
    bar: 'bg-emerald-500',
    barTrack: 'bg-emerald-100',
    emoji: '📝',
  },
  checklist: {
    card: 'bg-rose-50/80',
    iconBg: 'bg-rose-200',
    iconRing: 'ring-rose-300/60',
    bar: 'bg-rose-500',
    barTrack: 'bg-rose-100',
    emoji: '✅',
  },
  todo: {
    card: 'bg-sky-50/80',
    iconBg: 'bg-sky-200',
    iconRing: 'ring-sky-300/60',
    bar: 'bg-sky-500',
    barTrack: 'bg-sky-100',
    emoji: '🎯',
  },
}

export function MemoCard({ memo }: { memo: Memo }) {
  const meta = MEMO_TYPE_META[memo.type]
  const c = palette[memo.type]
  const due = dueLabel(memo.dueDate)
  const overdue = memo.dueDate && parseISO(memo.dueDate) < new Date(new Date().toDateString())

  const checklistDone = memo.type === 'checklist'
    ? memo.items.filter((i) => i.checked).length
    : 0
  const checklistTotal = memo.type === 'checklist' ? memo.items.length : 0
  const checklistPct = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0

  return (
    <Link
      to={`/memo/${memo.id}`}
      className={[
        'group block rounded-xl shadow-soft hover:shadow-card transition-shadow border border-slate-200/80 overflow-hidden',
        c.card,
      ].join(' ')}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div
            className={[
              'shrink-0 grid place-items-center w-14 h-14 rounded-xl text-2xl ring-1',
              c.iconBg,
              c.iconRing,
            ].join(' ')}
          >
            <span aria-hidden>{c.emoji}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-ink-500">{meta.label}</span>
              {memo.pinned && <span className="text-amber-500 text-xs">📌</span>}
            </div>
            <h3 className="mt-0.5 font-semibold text-ink-900 truncate">
              {memo.title || '제목 없음'}
            </h3>
            {memo.body && (
              <p className="mt-1 text-sm text-ink-500 line-clamp-2 whitespace-pre-line">
                {memo.body}
              </p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
              {due && (
                <span className={['inline-flex items-center gap-1', overdue && !memo.done ? 'text-rose-600 font-medium' : ''].join(' ')}>
                  📅 {due}
                </span>
              )}
              {memo.attachments.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <PaperclipIcon width={12} height={12} />
                  {memo.attachments.length}
                </span>
              )}
              {memo.type === 'todo' && memo.done && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">✓ 완료</span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar — checklist 진행률 또는 type 별 액센트 라인 */}
        {memo.type === 'checklist' && checklistTotal > 0 ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-ink-500 mb-1">
              <span>{checklistDone} / {checklistTotal}</span>
              <span className="font-semibold">{Math.round(checklistPct)}%</span>
            </div>
            <div className={['h-1.5 rounded-full overflow-hidden', c.barTrack].join(' ')}>
              <div
                className={['h-full transition-all', c.bar].join(' ')}
                style={{ width: `${checklistPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className={['mt-3 h-1 rounded-full', c.bar, 'opacity-70'].join(' ')} />
        )}
      </div>
    </Link>
  )
}
