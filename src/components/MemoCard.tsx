import { Link } from 'react-router-dom'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Memo } from '../types'
import { MEMO_TYPE_META } from '../types'
import { TypeIconFor, PaperclipIcon, PinIcon } from './Icons'

function dueLabel(d?: string) {
  if (!d) return null
  const date = parseISO(d)
  if (isToday(date)) return '오늘'
  if (isTomorrow(date)) return '내일'
  if (isYesterday(date)) return '어제'
  return format(date, 'M월 d일 (eee)', { locale: ko })
}

export function MemoCard({ memo }: { memo: Memo }) {
  const meta = MEMO_TYPE_META[memo.type]
  const due = dueLabel(memo.dueDate)
  const overdue = memo.dueDate && parseISO(memo.dueDate) < new Date(new Date().toDateString())

  const checklistDone = memo.type === 'checklist'
    ? memo.items.filter((i) => i.checked).length
    : 0
  const checklistTotal = memo.type === 'checklist' ? memo.items.length : 0

  return (
    <Link
      to={`/memo/${memo.id}`}
      className="group block rounded-2xl bg-white shadow-soft hover:shadow-card transition-shadow border border-white/80 overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={[
              'shrink-0 grid place-items-center w-10 h-10 rounded-xl',
              memo.type === 'note' && 'bg-note-100 text-note-600',
              memo.type === 'checklist' && 'bg-check-100 text-check-600',
              memo.type === 'todo' && 'bg-todo-100 text-todo-600',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <TypeIconFor type={memo.type} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-ink-400">{meta.label}</span>
              {memo.pinned && <PinIcon width={12} height={12} className="text-amber-500" />}
            </div>
            <h3 className="mt-0.5 font-semibold text-ink-900 truncate">
              {memo.title || '제목 없음'}
            </h3>
            {memo.body && (
              <p className="mt-1 text-sm text-ink-500 line-clamp-2 whitespace-pre-line">
                {memo.body}
              </p>
            )}

            {memo.type === 'checklist' && checklistTotal > 0 && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                  <span>{checklistDone} / {checklistTotal}</span>
                  <span>{Math.round((checklistDone / checklistTotal) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-check-50 overflow-hidden">
                  <div
                    className="h-full bg-check-500 transition-all"
                    style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-2.5 flex items-center gap-3 text-xs text-ink-400">
              {due && (
                <span className={['inline-flex items-center gap-1', overdue && !memo.done ? 'text-check-600 font-medium' : ''].join(' ')}>
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
                <span className="inline-flex items-center gap-1 text-note-600 font-medium">완료</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
