import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { deleteMemo, getMemo, saveMemo } from '../db'
import type { ChecklistItem, Memo } from '../types'
import { MEMO_TYPE_META } from '../types'
import { TopBar } from '../components/TopBar'
import { PaperclipIcon, PinIcon, TrashIcon } from '../components/Icons'

export default function Detail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [memo, setMemo] = useState<Memo | null>(null)

  useEffect(() => {
    if (!id) return
    void getMemo(id).then((m) => setMemo(m ?? null))
  }, [id])

  if (!id) return null
  if (!memo) {
    return (
      <div className="p-8 text-center text-ink-500">
        메모를 찾을 수 없어요.
        <div className="mt-3">
          <Link to="/" className="text-ink-900 underline">홈으로</Link>
        </div>
      </div>
    )
  }

  const meta = MEMO_TYPE_META[memo.type]

  const toggleItem = async (idx: number) => {
    const items: ChecklistItem[] = memo.items.map((it, i) =>
      i === idx ? { ...it, checked: !it.checked } : it,
    )
    const next = { ...memo, items, updatedAt: Date.now() }
    setMemo(next)
    await saveMemo(next)
  }

  const togglePin = async () => {
    const next = { ...memo, pinned: !memo.pinned, updatedAt: Date.now() }
    setMemo(next)
    await saveMemo(next)
  }

  const toggleDone = async () => {
    const next = { ...memo, done: !memo.done, updatedAt: Date.now() }
    setMemo(next)
    await saveMemo(next)
  }

  const onDelete = async () => {
    if (!confirm('이 메모를 삭제할까요?')) return
    await deleteMemo(memo.id)
    navigate('/', { replace: true })
  }

  return (
    <div className="pb-32">
      <TopBar
        back
        title={memo.title || '제목 없음'}
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={togglePin}
              className={[
                'p-2 rounded-xl hover:bg-white/60',
                memo.pinned ? 'text-amber-500' : 'text-ink-400',
              ].join(' ')}
              aria-label="고정"
            >
              <PinIcon />
            </button>
            <Link
              to={`/memo/${memo.id}/edit`}
              className="px-3 py-1.5 rounded-xl bg-ink-900 text-white text-sm font-semibold"
            >
              편집
            </Link>
          </div>
        }
      />

      {/* Meta strip */}
      <div className="px-5 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl',
            memo.type === 'note' && 'bg-note-100 text-note-700',
            memo.type === 'checklist' && 'bg-check-100 text-check-700',
            memo.type === 'todo' && 'bg-todo-100 text-todo-700',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span aria-hidden className="text-sm leading-none">{meta.emoji}</span>
          <span className="font-medium">{meta.label}</span>
        </span>
        {memo.dueDate && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-soft text-ink-700">
            📅 {format(parseISO(memo.dueDate), 'yyyy년 M월 d일 (eee)', { locale: ko })}
          </span>
        )}
        <span className="ml-auto text-ink-400">
          {format(new Date(memo.updatedAt), 'M월 d일 HH:mm', { locale: ko })} 수정
        </span>
      </div>

      {/* Body */}
      {memo.body && (
        <section className="px-5 mt-5">
          <div className="rounded-xl bg-white shadow-soft border border-slate-200/80 p-5">
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink-900">
              {memo.body}
            </p>
          </div>
        </section>
      )}

      {/* Items */}
      {memo.items.length > 0 && (
        <section className="px-5 mt-4">
          <div className="rounded-xl bg-white shadow-soft border border-slate-200/80 p-3">
            <div className="text-xs font-semibold text-ink-500 mb-2 px-2">
              {memo.type === 'checklist' ? '체크리스트' : '세부 할 일'}
            </div>
            {memo.items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => void toggleItem(idx)}
                className="w-full flex items-center gap-2 px-1 py-2 text-left hover:bg-ink-900/[0.02] rounded-lg"
              >
                <span
                  className={[
                    'w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition-colors',
                    item.checked
                      ? 'bg-check-500 border-check-500 text-white'
                      : 'border-ink-400 bg-white',
                  ].join(' ')}
                >
                  {item.checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  )}
                </span>
                <span className={item.checked ? 'line-through text-ink-400' : 'text-ink-900'}>
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Attachments */}
      {memo.attachments.length > 0 && (
        <section className="px-5 mt-4">
          <div className="rounded-xl bg-white shadow-soft border border-slate-200/80 p-3">
            <div className="text-xs font-semibold text-ink-500 mb-2 px-2 inline-flex items-center gap-1">
              <PaperclipIcon width={12} height={12} />
              첨부파일 {memo.attachments.length}
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {memo.attachments.map((a) => (
                <li key={a.id} className="rounded-xl overflow-hidden bg-ink-900/[0.03]">
                  {a.mime.startsWith('image/') ? (
                    <a href={a.dataUrl} target="_blank" rel="noreferrer">
                      <img src={a.dataUrl} alt={a.name} className="w-full aspect-square object-cover" />
                    </a>
                  ) : (
                    <a
                      href={a.dataUrl}
                      download={a.name}
                      className="flex items-center gap-2 p-3"
                    >
                      <div className="w-10 h-10 rounded-md bg-white grid place-items-center text-ink-400">
                        <PaperclipIcon />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{a.name}</p>
                        <p className="text-xs text-ink-400">{formatBytes(a.size)}</p>
                      </div>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="px-5 mt-6 flex items-center gap-2">
        {memo.type === 'todo' && (
          <button
            onClick={() => void toggleDone()}
            className={[
              'flex-1 py-3 rounded-xl font-semibold shadow-soft',
              memo.done
                ? 'bg-white text-ink-700'
                : 'bg-note-500 text-white',
            ].join(' ')}
          >
            {memo.done ? '미완료로 되돌리기' : '완료로 표시'}
          </button>
        )}
        <button
          onClick={() => void onDelete()}
          className="px-4 py-3 rounded-xl bg-white text-check-600 shadow-soft inline-flex items-center gap-1.5"
        >
          <TrashIcon width={18} height={18} /> 삭제
        </button>
      </div>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
