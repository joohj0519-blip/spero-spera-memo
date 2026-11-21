import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
import { BellIcon, TickIcon } from './Icons'
import {
  ackReminder,
  fireSystemNotifications,
  getDueReminders,
  isBannerSnoozedToday,
  snoozeBannerToday,
  type ReminderItem,
} from '../lib/reminders'

export function ReminderBanner() {
  const [items, setItems] = useState<ReminderItem[]>([])
  const [snoozed, setSnoozed] = useState(() => isBannerSnoozedToday())

  useEffect(() => {
    let alive = true
    const reload = async () => {
      const memos = await listMemos()
      if (!alive) return
      const due = getDueReminders(memos)
      setItems(due)
      fireSystemNotifications(due)
    }
    void reload()
    const off = onMemosChanged(() => { void reload() })
    // 자정을 지나면 새 항목이 due 가 될 수 있으니 1시간마다 재계산
    const interval = window.setInterval(() => {
      setSnoozed(isBannerSnoozedToday())
      void reload()
    }, 60 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setSnoozed(isBannerSnoozedToday())
        void reload()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      off()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (snoozed || items.length === 0) return null

  const first = items[0]
  const more = items.length - 1
  const dueLabel = first.daysOverdue === 0 ? '오늘 마감' : `${first.daysOverdue}일 지남`

  return (
    // 바탕을 크림색으로 두어 바로 아래 화면의 제목 영역과 이어지게 함
    <div className="px-4 pt-2 bg-paper">
      <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-terra-tint border border-terra/20">
        <BellIcon aria-hidden width={16} height={16} className="shrink-0 text-terra-ink" />
        <Link to="/all" className="flex-1 min-w-0 text-xs text-terra-ink inline-flex items-center gap-1.5">
          <span className={[
            'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold',
            first.daysOverdue === 0 ? 'bg-face text-terra-ink' : 'bg-terra text-face',
          ].join(' ')}>
            {dueLabel}
          </span>
          <span className="truncate font-semibold">
            {first.memo.title || '제목 없음'}
          </span>
          {more > 0 && (
            <span className="shrink-0">외 {more}건</span>
          )}
        </Link>
        {/* 확인 체크 — 지금 보이는 알림을 '확인' 처리. 저장되면 목록이 자동으로 다시 읽혀
            이 알림은 사라지고, 남은 알림이 있으면 다음 것이 이어서 보인다. */}
        <button
          onClick={() => { void ackReminder(first.memo) }}
          className="shrink-0 h-8 px-2.5 rounded-lg bg-char text-paper text-[11px] font-bold inline-flex items-center gap-1"
          aria-label="확인 — 이 알림 다시 보지 않기"
          title="확인 — 이 알림 다시 보지 않기"
        >
          <TickIcon aria-hidden width={12} height={12} strokeWidth={3} /> 확인
        </button>
        <button
          onClick={() => { snoozeBannerToday(); setSnoozed(true) }}
          className="shrink-0 w-8 h-8 grid place-items-center text-terra-ink text-xs"
          aria-label="오늘 숨기기"
          title="오늘 하루만 숨기기"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
