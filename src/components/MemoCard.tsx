import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { Memo } from '../types'
import { isCompleted } from '../db'
import { TYPE_THEME, daysOverdue } from '../lib/theme'
import { PinIcon, TickIcon } from './Icons'
import { GroupTag } from './Folder'
import { memoGroups } from '../lib/groups'

/**
 * 목록의 메모 한 줄.
 * - 진행 중: 왼쪽에 종류 색 칸 + 아이콘, 오른쪽에 진행(2/5)·마감 표시
 * - 완료: 흐리게, 줄을 그어 표시 (목록 아래쪽 '완료' 묶음에 놓인다)
 * 예전에는 카드형/줄형 두 가지였지만 새 디자인에서는 이 한 가지 모양만 쓴다.
 */
export function MemoCard({ memo }: { memo: Memo }) {
  const t = TYPE_THEME[memo.type]
  const done = isCompleted(memo)
  // 줄이 좁아서 그룹은 첫 번째 것만 보여 주고, 더 있으면 '+2'처럼 개수만 덧붙인다
  const groups = memoGroups(memo)
  const groupTag = groups.length > 0 && (
    <span className="shrink min-w-0 max-w-[84px] inline-flex items-center gap-1">
      <GroupTag name={groups[0]} small />
      {groups.length > 1 && <span className="shrink-0 text-[10px] font-semibold text-char-mute">+{groups.length - 1}</span>}
    </span>
  )

  if (done) {
    return (
      <Link
        to={`/memo/${memo.id}`}
        className="flex items-center gap-2.5 h-10 pl-2 pr-3 rounded-[10px] bg-paper text-char-mute"
      >
        <span aria-hidden className="w-6 h-6 shrink-0 rounded-full bg-[#D9CDB9] grid place-items-center text-char-soft">
          <TickIcon width={13} height={13} strokeWidth={2.6} />
        </span>
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium line-through">
          {memo.title || '제목 없음'}
        </span>
        {groupTag}
        <span className="shrink-0 text-[10.5px] font-semibold">완료</span>
      </Link>
    )
  }

  const checkedCount = memo.items.filter((i) => i.checked).length
  const over = daysOverdue(memo)
  // 마감 표시: 지남(진한 주황) / 오늘(연한 주황) / 앞으로(연한 초록, 날짜만)
  // 일반 메모는 '끝내야 하는 일'이 아니라서 지남·마감 대신 날짜만 보여 준다
  const dateOnly = memo.dueDate ? { text: format(parseISO(memo.dueDate), 'M.d'), cls: 'bg-sage-tint text-sage-ink' } : null
  const due =
    over === null ? null
      : memo.type === 'note' ? dateOnly
        : over > 0 ? { text: `${over}일 지남`, cls: 'bg-terra text-face' }
          : over === 0 ? { text: '오늘 마감', cls: 'bg-terra-tint text-terra-ink' }
            : dateOnly

  return (
    <Link
      to={`/memo/${memo.id}`}
      className="flex items-center gap-2.5 h-[46px] pr-3 rounded-[10px] bg-sheet border border-line overflow-hidden text-char hover:border-char/40 transition-colors"
    >
      <span
        aria-hidden
        className="w-[34px] self-stretch shrink-0 grid place-items-center"
        style={{ background: t.bg, color: t.fg }}
      >
        <t.Icon width={17} height={17} />
      </span>
      <span className="flex-1 min-w-0 truncate text-[13.5px] font-semibold">{memo.title || '제목 없음'}</span>
      {groupTag}
      {memo.pinned && <PinIcon aria-label="고정됨" width={15} height={15} className="shrink-0 text-terra-light" />}
      {memo.items.length > 0 && (
        <span className="shrink-0 px-2 py-[3px] rounded-full bg-sand-tint text-char-soft text-[10.5px] font-bold tabular-nums">
          {checkedCount}/{memo.items.length}
        </span>
      )}
      {due && (
        <span className={['shrink-0 px-2 py-[3px] rounded-full text-[10.5px] font-bold tabular-nums', due.cls].join(' ')}>
          {due.text}
        </span>
      )}
    </Link>
  )
}
