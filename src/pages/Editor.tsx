import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fileToDataUrl, getMemo, newId, saveMemo } from '../db'
import type { Attachment, ChecklistItem, Memo, MemoType } from '../types'
import { MEMO_TYPE_META } from '../types'
import { TopBar } from '../components/TopBar'
import { CheckIcon, NoteIcon, PaperclipIcon, PlusIcon, TargetIcon, TrashIcon } from '../components/Icons'

const empty = (type: MemoType): Memo => ({
  id: newId(),
  type,
  title: '',
  body: '',
  items: [],
  attachments: [],
  pinned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const TYPE_TABS: { type: MemoType; Icon: typeof NoteIcon }[] = [
  { type: 'note', Icon: NoteIcon },
  { type: 'checklist', Icon: CheckIcon },
  { type: 'todo', Icon: TargetIcon },
]

export default function Editor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialType = (params.get('type') as MemoType | null) ?? 'note'
  const [memo, setMemo] = useState<Memo>(() => empty(initialType))
  const [loaded, setLoaded] = useState(!id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!id

  useEffect(() => {
    if (!id) return
    void getMemo(id).then((m) => {
      if (m) setMemo(m)
      setLoaded(true)
    })
  }, [id])

  const update = <K extends keyof Memo>(k: K, v: Memo[K]) =>
    setMemo((prev) => ({ ...prev, [k]: v }))

  const addItem = () => {
    update('items', [...memo.items, { id: newId(), text: '', checked: false }])
  }
  const updateItem = (idx: number, patch: Partial<ChecklistItem>) => {
    const items = memo.items.slice()
    items[idx] = { ...items[idx], ...patch }
    update('items', items)
  }
  const removeItem = (idx: number) => {
    update('items', memo.items.filter((_, i) => i !== idx))
  }

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const additions: Attachment[] = []
    for (const f of Array.from(files)) {
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} 은(는) 5MB 를 초과합니다. (로컬 저장 한도)`)
        continue
      }
      const dataUrl = await fileToDataUrl(f)
      additions.push({
        id: newId(),
        name: f.name,
        mime: f.type,
        size: f.size,
        dataUrl,
      })
    }
    update('attachments', [...memo.attachments, ...additions])
  }
  const removeAttachment = (id: string) => {
    update('attachments', memo.attachments.filter((a) => a.id !== id))
  }

  const onSave = async () => {
    const final: Memo = {
      ...memo,
      title: memo.title.trim(),
      body: memo.body.trim(),
      items: memo.items.filter((i) => i.text.trim().length > 0),
      updatedAt: Date.now(),
    }
    if (!final.title && !final.body && final.items.length === 0 && final.attachments.length === 0) {
      navigate(-1)
      return
    }
    await saveMemo(final)
    navigate(`/memo/${final.id}`, { replace: true })
  }

  if (!loaded) {
    return <div className="p-8 text-ink-500">불러오는 중…</div>
  }

  const meta = MEMO_TYPE_META[memo.type]

  return (
    <div className="pb-40">
      <TopBar
        back
        subtitle={isEditing ? '메모 편집' : '새 메모'}
        title={meta.label}
        right={
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-semibold shadow-soft"
          >
            저장
          </button>
        }
      />

      {/* Type tabs */}
      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {TYPE_TABS.map(({ type, Icon }) => {
            const active = memo.type === type
            const m = MEMO_TYPE_META[type]
            return (
              <button
                key={type}
                onClick={() => update('type', type)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap border transition-colors',
                  active
                    ? type === 'note'
                      ? 'bg-note-500 text-white border-note-500'
                      : type === 'checklist'
                        ? 'bg-check-500 text-white border-check-500'
                        : 'bg-todo-500 text-white border-todo-500'
                    : 'bg-white text-ink-700 border-white shadow-soft',
                ].join(' ')}
              >
                <Icon width={16} height={16} strokeWidth={2} />
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <div className="px-5 mt-5">
        <input
          value={memo.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full bg-transparent text-2xl font-bold text-ink-900 placeholder:text-ink-400"
        />
      </div>

      {/* Date */}
      <div className="px-5 mt-3 flex items-center gap-2">
        <DateField
          value={memo.dueDate}
          onChange={(v) => update('dueDate', v)}
        />
        <button
          onClick={() => update('pinned', !memo.pinned)}
          className={[
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            memo.pinned
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-white text-ink-500 border-white shadow-soft',
          ].join(' ')}
        >
          📌 {memo.pinned ? '고정됨' : '고정하기'}
        </button>
      </div>

      {/* Body */}
      <div className="px-5 mt-4">
        <textarea
          value={memo.body}
          onChange={(e) => update('body', e.target.value)}
          placeholder={memo.type === 'note' ? '내용을 자유롭게 적어보세요…' : '메모 (선택)'}
          rows={memo.type === 'note' ? 10 : 4}
          className="w-full bg-white/70 rounded-2xl p-4 shadow-soft border border-white/80 text-[15px] leading-relaxed resize-none placeholder:text-ink-400"
        />
      </div>

      {/* Checklist / Todo items */}
      {(memo.type === 'checklist' || memo.type === 'todo') && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl bg-white shadow-soft border border-white/80 p-3">
            <div className="text-xs font-semibold text-ink-500 mb-2 px-2">
              {memo.type === 'checklist' ? '체크리스트' : '세부 할 일'}
            </div>
            {memo.items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 px-1 py-1">
                <button
                  onClick={() => updateItem(idx, { checked: !item.checked })}
                  className={[
                    'w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition-colors',
                    item.checked
                      ? 'bg-check-500 border-check-500 text-white'
                      : 'border-ink-400 bg-white',
                  ].join(' ')}
                  aria-label="체크"
                >
                  {item.checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  )}
                </button>
                <input
                  value={item.text}
                  onChange={(e) => updateItem(idx, { text: e.target.value })}
                  placeholder="항목 입력"
                  className={[
                    'flex-1 bg-transparent py-1.5',
                    item.checked ? 'line-through text-ink-400' : 'text-ink-900',
                  ].join(' ')}
                />
                <button
                  onClick={() => removeItem(idx)}
                  className="text-ink-400 hover:text-check-600 p-1"
                  aria-label="삭제"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm text-ink-500 hover:bg-ink-900/5"
            >
              <PlusIcon width={16} height={16} /> 항목 추가
            </button>
          </div>
        </div>
      )}

      {/* Attachments */}
      <div className="px-5 mt-4">
        <div className="rounded-2xl bg-white shadow-soft border border-white/80 p-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-semibold text-ink-500">첨부파일</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs text-ink-700 hover:text-ink-900 px-2 py-1 rounded-md hover:bg-ink-900/5"
            >
              <PaperclipIcon width={14} height={14} />
              추가
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void onPickFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          {memo.attachments.length === 0 ? (
            <p className="px-2 pb-1 text-xs text-ink-400">파일을 추가하면 여기에 표시됩니다 (개당 5MB 제한)</p>
          ) : (
            <ul className="space-y-1.5">
              {memo.attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 px-2 py-2 rounded-xl bg-ink-900/[0.03]"
                >
                  {a.mime.startsWith('image/') ? (
                    <img src={a.dataUrl} alt="" className="w-10 h-10 rounded-md object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-white grid place-items-center text-ink-400">
                      <PaperclipIcon />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-900 truncate">{a.name}</p>
                    <p className="text-xs text-ink-400">{formatBytes(a.size)}</p>
                  </div>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="text-ink-400 hover:text-check-600 p-1"
                    aria-label="삭제"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function DateField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-soft border border-white/80 text-sm text-ink-700 cursor-pointer">
      <span>📅</span>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-transparent outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onChange(undefined)
          }}
          className="text-ink-400 hover:text-check-600 ml-1 text-xs"
        >
          ✕
        </button>
      )}
    </label>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
