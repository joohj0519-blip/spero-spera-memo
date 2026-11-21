import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fileToDataUrl, getMemo, listVisibleMemos, newId, saveMemo } from '../db'
import { cleanGroupName, collectGroups, memoGroups } from '../lib/groups'
import type { Attachment, ChecklistItem, Memo, MemoType } from '../types'
import { TYPE_THEME } from '../lib/theme'
import { FolderStack, GroupChip, RoundButton, SectionLabel, Sheet } from '../components/Folder'
import type { FolderDef } from '../components/Folder'
import { BackIcon, CalendarIcon, PaperclipIcon, PinIcon, PlusIcon, TickIcon, TrashIcon } from '../components/Icons'
import { notificationPermission, requestNotificationPermission } from '../lib/reminders'

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

// 종류 고르기 탭 — 선택한 종류의 서류철이 맨 앞으로 온다. 탭 위치(x)는 고정.
const TYPE_FOLDERS: FolderDef[] = (
  [['todo', 250], ['note', 132], ['checklist', 14]] as Array<[MemoType, number]>
).map(([type, x]) => ({
  id: type,
  label: TYPE_THEME[type].label,
  color: TYPE_THEME[type].bg,
  fg: TYPE_THEME[type].fg,
  x,
}))

export default function Editor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialType = (params.get('type') as MemoType | null) ?? 'note'
  const [memo, setMemo] = useState<Memo>(() => empty(initialType))
  const [loaded, setLoaded] = useState(!id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 지금까지 다른 메모에서 쓴 그룹 이름들 (골라 붙일 수 있게 보여 줌)
  const [knownGroups, setKnownGroups] = useState<string[]>([])
  const [groupDraft, setGroupDraft] = useState('')

  useEffect(() => {
    void listVisibleMemos().then((ms) => setKnownGroups(collectGroups(ms).map((g) => g.name)))
  }, [])

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

  const toggleGroup = (name: string) => {
    const cur = memoGroups(memo)
    update('groups', cur.includes(name) ? cur.filter((g) => g !== name) : [...cur, name])
  }
  const addGroup = () => {
    const name = cleanGroupName(groupDraft)
    setGroupDraft('')
    if (!name) return
    if (!memoGroups(memo).includes(name)) update('groups', [...memoGroups(memo), name])
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
      // 입력칸에 적어 놓고 '추가'를 안 누른 그룹 이름도 저장할 때 함께 붙여 준다 (깜빡해도 사라지지 않게)
      groups: [...new Set([...memoGroups(memo), ...(cleanGroupName(groupDraft) ? [cleanGroupName(groupDraft)] : [])])],
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
    return <div className="p-8 text-char-mute">불러오는 중…</div>
  }

  const hasItems = memo.type === 'checklist' || memo.type === 'todo'
  const checkedCount = memo.items.filter((i) => i.checked).length
  const theme = TYPE_THEME[memo.type]

  return (
    <Sheet
      header={
        <div className="px-4 pt-[26px] flex items-center justify-between gap-3">
          <RoundButton label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon width={22} height={22} strokeWidth={2.2} />
          </RoundButton>
          <h1 className="m-0 text-lg font-extrabold">{id ? '고쳐 쓰기' : '새로 쓰기'}</h1>
          <button
            type="button"
            onClick={onSave}
            className="h-11 px-[18px] rounded-full bg-char text-paper text-sm font-bold"
          >
            저장
          </button>
        </div>
      }
      stack={
        <FolderStack
          label="종류 선택"
          folders={TYPE_FOLDERS}
          activeId={memo.type}
          tabWidth={64}
          frontStrip={14}
          onSelect={(t) => update('type', t as MemoType)}
        />
      }
    >
      <div className="px-5 pt-[18px] pb-8 flex flex-col">
        {/* 제목 */}
        <label className="flex flex-col gap-1.5">
          <SectionLabel>제목</SectionLabel>
          <input
            value={memo.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="제목을 입력하세요"
            className="h-[46px] bg-transparent border-b-2 border-char text-xl font-bold text-char placeholder:text-char-mute placeholder:font-medium"
          />
        </label>

        {/* 항목 (체크리스트·할 일) */}
        {hasItems && (
          <div className="mt-[18px] flex flex-col">
            <div className="flex items-center justify-between">
              <SectionLabel>{memo.type === 'checklist' ? '항목' : '세부 할 일'}</SectionLabel>
              {memo.items.length > 0 && (
                <span className="text-[11.5px] font-semibold text-terra-dark tabular-nums">
                  {checkedCount} / {memo.items.length} 완료
                </span>
              )}
            </div>
            {memo.items.length > 0 && (
              <div aria-hidden className="mt-2 h-1 rounded-full bg-rule overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(checkedCount / memo.items.length) * 100}%`, background: theme.bg }}
                />
              </div>
            )}
            <div className="mt-1 flex flex-col">
              {/* 작성 화면에서는 입력하던 줄이 갑자기 움직이지 않도록, 체크해도 순서를 바꾸지 않는다 (아래로 내리는 정렬은 상세 화면에서만) */}
              {memo.items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2.5 h-11 border-b border-rule">
                  <button
                    type="button"
                    onClick={() => updateItem(idx, { checked: !item.checked })}
                    aria-label={item.checked ? '체크 해제' : '체크'}
                    aria-pressed={item.checked}
                    className={[
                      'w-[22px] h-[22px] shrink-0 rounded-md grid place-items-center transition-colors',
                      item.checked ? 'bg-terra text-face' : 'border-2 border-char-mute bg-sheet',
                    ].join(' ')}
                  >
                    {item.checked && <TickIcon width={13} height={13} strokeWidth={3} />}
                  </button>
                  <input
                    value={item.text}
                    onChange={(e) => updateItem(idx, { text: e.target.value })}
                    placeholder="항목 입력"
                    aria-label="항목"
                    className={[
                      'flex-1 min-w-0 bg-transparent text-sm placeholder:text-char-mute',
                      item.checked ? 'line-through text-char-mute' : 'text-char',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="w-9 h-9 grid place-items-center text-char-mute hover:text-terra-dark"
                    aria-label="항목 삭제"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2.5 h-11 rounded-[10px] border-[1.5px] border-dashed border-ink-400 text-char-soft text-[13.5px] font-semibold flex items-center justify-center gap-1.5 hover:bg-sheet"
            >
              <PlusIcon width={16} height={16} strokeWidth={2.2} /> 항목 추가
            </button>
          </div>
        )}

        {/* 내용 */}
        <label className="mt-4 flex flex-col gap-1.5">
          <SectionLabel>{memo.type === 'note' ? '내용' : '메모'}</SectionLabel>
          <textarea
            value={memo.body}
            onChange={(e) => update('body', e.target.value)}
            placeholder={memo.type === 'note' ? '내용을 자유롭게 적어보세요…' : '메모 (선택)'}
            rows={memo.type === 'note' ? 10 : 3}
            className="w-full rounded-[10px] bg-sheet border border-line px-3 py-2.5 text-sm leading-relaxed resize-none placeholder:text-char-mute"
          />
        </label>

        {/* 날짜 · 고정 · 첨부 */}
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <DateField
            value={memo.dueDate}
            onChange={(v) => {
              update('dueDate', v)
              if (v && (memo.type === 'todo' || memo.type === 'checklist')
                && notificationPermission() === 'default') {
                void requestNotificationPermission()
              }
            }}
          />
          <button
            type="button"
            aria-pressed={memo.pinned}
            onClick={() => update('pinned', !memo.pinned)}
            className={[
              'h-12 rounded-[10px] border text-[12.5px] flex items-center justify-center gap-1.5 transition-colors',
              memo.pinned ? 'bg-terra-tint border-terra/30 text-terra-ink font-bold' : 'bg-sheet border-line text-char font-semibold',
            ].join(' ')}
          >
            <PinIcon width={17} height={17} /> {memo.pinned ? '고정됨' : '위에 고정'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-12 rounded-[10px] border border-line bg-sheet text-char text-[12.5px] font-semibold flex items-center justify-center gap-1.5"
          >
            <PaperclipIcon width={17} height={17} /> 파일 첨부
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

        {/* 그룹 — 전에 쓴 그룹은 눌러서 붙이고, 새 그룹은 이름을 적어 추가 (여러 개 가능) */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <SectionLabel>그룹</SectionLabel>
            <span className="text-[11.5px] text-char-mute">여러 개 붙일 수 있어요</span>
          </div>
          {/* 이 메모에 붙은 그룹(새로 만든 것 포함)을 앞에, 나머지 기존 그룹을 뒤에 */}
          {(() => {
            const mine = memoGroups(memo)
            const names = [...mine, ...knownGroups.filter((g) => !mine.includes(g))]
            return names.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {names.map((g) => (
                  <GroupChip key={g} name={`#${g}`} active={mine.includes(g)} onClick={() => toggleGroup(g)} />
                ))}
              </div>
            )
          })()}
          <div className="flex gap-2">
            <input
              value={groupDraft}
              onChange={(e) => setGroupDraft(e.target.value)}
              onKeyDown={(e) => {
                // 한글 조합 중의 Enter 는 글자 확정용이라 건너뛴다 (안 그러면 마지막 글자가 두 번 들어감)
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  addGroup()
                }
              }}
              placeholder="새 그룹 이름 (예: 업무)"
              aria-label="새 그룹 이름"
              maxLength={20}
              className="flex-1 min-w-0 h-11 rounded-[10px] bg-sheet border border-line px-3 text-sm placeholder:text-char-mute"
            />
            <button
              type="button"
              onClick={addGroup}
              className="shrink-0 h-11 px-4 rounded-[10px] border-[1.5px] border-char text-char text-[13px] font-bold"
            >
              추가
            </button>
          </div>
        </div>

        {/* 첨부파일 목록 */}
        {memo.attachments.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <SectionLabel>첨부 {memo.attachments.length}</SectionLabel>
            <ul className="flex flex-col gap-1.5">
              {memo.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 h-[52px] pl-3 pr-1.5 rounded-[10px] bg-sheet border border-line">
                  {a.mime.startsWith('image/') ? (
                    <img src={a.dataUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span aria-hidden className="w-8 h-8 rounded-lg bg-sand-tint grid place-items-center shrink-0">
                      <PaperclipIcon width={17} height={17} />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 truncate text-[13.5px] font-semibold">{a.name}</span>
                  <span className="shrink-0 text-[11.5px] text-char-mute">{formatBytes(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="w-9 h-9 grid place-items-center text-char-mute hover:text-terra-dark"
                    aria-label="첨부 삭제"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-[11.5px] text-char-mute">첨부는 파일 하나에 5MB까지 넣을 수 있어요.</p>
      </div>
    </Sheet>
  )
}

function DateField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  // 날짜 칸 전체를 눌러도 달력이 열리도록, 실제 날짜 입력칸을 버튼 위에 투명하게 덮어 둔다
  return (
    <div
      className={[
        'relative h-12 rounded-[10px] border text-[12.5px] flex items-center justify-center gap-1.5',
        value ? 'bg-terra-tint border-terra/30 text-terra-ink font-bold' : 'bg-sheet border-line text-char font-semibold',
      ].join(' ')}
    >
      <CalendarIcon aria-hidden width={17} height={17} />
      <span>{value ? `${Number(value.slice(5, 7))}.${Number(value.slice(8, 10))}` : '날짜'}</span>
      <input
        type="date"
        value={value ?? ''}
        aria-label="날짜"
        onChange={(e) => onChange(e.target.value || undefined)}
        onClick={(e) => {
          // 일부 브라우저는 투명한 입력칸을 눌러도 달력이 안 열려서 직접 열어 준다
          try { e.currentTarget.showPicker?.() } catch { /* 지원하지 않는 브라우저는 기본 동작에 맡김 */ }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="날짜 지우기"
          className="relative z-10 w-6 h-6 grid place-items-center text-xs"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
