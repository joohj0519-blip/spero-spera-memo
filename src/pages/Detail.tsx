import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { deleteMemo, getMemo, isCompleted, saveMemo } from '../db'
import type { ChecklistItem, Memo } from '../types'
import { TYPE_THEME, daysOverdue } from '../lib/theme'
import { FolderStack, GroupTag, RoundButton, SectionLabel, Sheet } from '../components/Folder'
import { memoGroups } from '../lib/groups'
import { BackIcon, CalendarIcon, EditIcon, FileIcon, PinIcon, TickIcon, TrashIcon } from '../components/Icons'

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
      <div className="p-8 text-center text-char-mute">
        메모를 찾을 수 없어요.
        <div className="mt-3">
          <Link to="/" className="text-char underline">홈으로</Link>
        </div>
      </div>
    )
  }

  const theme = TYPE_THEME[memo.type]

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

  const checkedCount = memo.items.filter((i) => i.checked).length
  const over = daysOverdue(memo)
  // 일반 메모는 마감 개념이 없으므로 '오늘 마감·N일 지남' 꼬리말을 붙이지 않는다
  // 일정도 '마감'이 아니라 그날 있는 일이므로 당일에만 '오늘'이라고 붙인다
  const dueNote =
    over === null || memo.type === 'note' || isCompleted(memo) ? ''
      : memo.type === 'event' ? (over === 0 ? ' · 오늘' : '')
        : over === 0 ? ' · 오늘 마감' : over > 0 ? ` · ${over}일 지남` : ''

  return (
    <Sheet
      header={
        <div className="px-4 pt-[26px] flex items-center justify-between gap-3">
          <RoundButton label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon width={22} height={22} strokeWidth={2.2} />
          </RoundButton>
          <div className="flex items-center gap-2">
            <RoundButton label={memo.pinned ? '고정 해제' : '위에 고정'} pressed={memo.pinned} onClick={() => void togglePin()}>
              <PinIcon strokeWidth={2} className={memo.pinned ? 'text-terra-light' : 'text-char-mute'} />
            </RoundButton>
            <Link
              to={`/memo/${memo.id}/edit`}
              className="h-11 px-4 rounded-full bg-char text-paper text-sm font-bold inline-flex items-center gap-1.5"
            >
              <EditIcon aria-hidden width={16} height={16} strokeWidth={2} /> 편집
            </Link>
          </div>
        </div>
      }
      stack={
        <FolderStack
          label="메모 종류"
          folders={[{ id: memo.type, label: theme.label, color: theme.bg, fg: theme.fg, x: 14 }]}
          activeId={memo.type}
          tabWidth={64}
          frontStrip={14}
        />
      }
    >
      <div className="flex-1 flex flex-col px-5 pt-[18px] pb-5">
        <h1 className="m-0 text-[23px] leading-tight font-extrabold break-words">{memo.title || '제목 없음'}</h1>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {memo.dueDate && (
            <span className="inline-flex items-center gap-[5px] px-2.5 py-[5px] rounded-full bg-terra-tint text-terra-ink text-[11.5px] font-bold">
              <CalendarIcon aria-hidden width={14} height={14} strokeWidth={2} />
              {format(parseISO(memo.dueDate), 'M월 d일 (eee)', { locale: ko })}{dueNote}
            </span>
          )}
          <span className="px-2.5 py-[5px] rounded-full bg-sand-tint text-char-soft text-[11.5px] font-semibold">
            {format(new Date(memo.updatedAt), 'M월 d일 HH:mm', { locale: ko })} 수정
          </span>
        </div>

        {memoGroups(memo).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* 그룹을 누르면 '모두' 화면에서 그 그룹의 메모만 모아 본다 */}
            {memoGroups(memo).map((g) => (
              <Link key={g} to={`/all?group=${encodeURIComponent(g)}`} className="max-w-full">
                <GroupTag name={g} />
              </Link>
            ))}
          </div>
        )}

        {memo.body && (
          <p className="mt-4 mb-0 text-sm leading-[1.65] whitespace-pre-line break-words">{memo.body}</p>
        )}

        {memo.items.length > 0 && (
          <div className="mt-[18px] flex flex-col">
            <div className="flex items-center justify-between">
              <SectionLabel>{memo.type === 'checklist' ? '체크리스트' : '세부 할 일'}</SectionLabel>
              <span className="text-[11.5px] font-semibold text-char-soft tabular-nums">
                {checkedCount} / {memo.items.length} 완료
              </span>
            </div>
            <div aria-hidden className="mt-2 h-1 rounded-full bg-rule overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(checkedCount / memo.items.length) * 100}%`, background: memo.type === 'note' ? '#7D8B6C' : theme.bg }}
              />
            </div>
            <div className="mt-1 flex flex-col">
              {/* 체크한(완료) 항목은 아래로, 아직 남은 항목은 위로 보여 준다.
                  - 저장된 순서 자체는 바꾸지 않고 '보이는 순서'만 정렬한다.
                    → 체크를 다시 풀면 원래 있던 자리로 돌아오고, 수정 화면의 순서도 그대로 유지됨
                  - idx(원래 위치)를 같이 들고 다니는 이유: toggleItem 이 원래 위치로 항목을 찾기 때문
                  - sort 는 순서가 같은 것끼리는 기존 순서를 지켜 주므로(안정 정렬) 묶음 안의 순서는 그대로 */}
              {memo.items
                .map((item, idx) => ({ item, idx }))
                .sort((a, b) => Number(a.item.checked) - Number(b.item.checked))
                .map(({ item, idx }) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.checked}
                    onClick={() => void toggleItem(idx)}
                    className={[
                      'flex items-center gap-2.5 min-h-11 py-2 border-b border-rule text-left text-sm',
                      item.checked ? 'text-char-mute line-through' : 'text-char',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className={[
                        'w-[22px] h-[22px] shrink-0 rounded-md grid place-items-center transition-colors',
                        item.checked ? 'bg-char-soft text-face' : 'border-2 border-char-mute bg-sheet',
                      ].join(' ')}
                    >
                      {item.checked && <TickIcon width={13} height={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 break-words">{item.text}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {memo.attachments.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <SectionLabel>첨부 {memo.attachments.length}</SectionLabel>
            <ul className="flex flex-col gap-1.5">
              {memo.attachments.map((a) => (
                <li key={a.id}>
                  {/* 그림은 새 창에서 크게 보고, 그 밖의 파일은 내려받는다 */}
                  <a
                    href={a.dataUrl}
                    {...(a.mime.startsWith('image/') ? { target: '_blank', rel: 'noreferrer' } : { download: a.name })}
                    className="flex items-center gap-2.5 h-[52px] px-3 rounded-[10px] bg-sheet border border-line text-char"
                  >
                    {a.mime.startsWith('image/') ? (
                      <img src={a.dataUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span aria-hidden className="w-8 h-8 rounded-lg bg-sand-tint grid place-items-center shrink-0">
                        <FileIcon width={17} height={17} />
                      </span>
                    )}
                    <span className="flex-1 min-w-0 truncate text-[13.5px] font-semibold">{a.name}</span>
                    <span className="shrink-0 text-[11.5px] text-char-mute">{formatBytes(a.size)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-6 flex gap-2">
          {memo.type === 'todo' && (
            <button
              type="button"
              onClick={() => void toggleDone()}
              className={[
                'flex-1 h-[50px] rounded-xl text-[15px] font-bold flex items-center justify-center gap-2',
                memo.done ? 'bg-sheet border border-line text-char' : 'bg-char text-paper',
              ].join(' ')}
            >
              {!memo.done && <TickIcon aria-hidden width={18} height={18} strokeWidth={2.6} />}
              {memo.done ? '미완료로 되돌리기' : '완료로 표시'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void onDelete()}
            className={[
              'h-[50px] px-4 rounded-xl border-[1.5px] border-terra text-terra-dark text-sm font-bold flex items-center justify-center gap-1.5',
              memo.type === 'todo' ? '' : 'flex-1',
            ].join(' ')}
          >
            <TrashIcon aria-hidden width={17} height={17} strokeWidth={2} /> 삭제
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
