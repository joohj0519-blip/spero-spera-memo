import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
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
    <div className="px-3 pt-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold-50 border border-gold-200 shadow-soft">
        <span aria-hidden className="text-base leading-none">🔔</span>
        <Link to="/all" className="flex-1 min-w-0 text-xs text-gold-900 inline-flex items-center gap-1.5">
          <span className={[
            'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
            first.daysOverdue === 0 ? 'bg-gold-200 text-gold-900' : 'bg-check-200 text-check-900',
          ].join(' ')}>
            {dueLabel}
          </span>
          <span className="truncate">
            {first.memo.title || '제목 없음'}
          </span>
          {more > 0 && (
            <span className="shrink-0 text-gold-700/80">외 {more}건</span>
          )}
        </Link>
        {/* 확인 체크 — 지금 보이는 알림을 '확인' 처리. 저장되면 목록이 자동으로 다시 읽혀
            이 알림은 사라지고, 남은 알림이 있으면 다음 것이 이어서 보인다. */}
        <button
          onClick={() => { void ackReminder(first.memo) }}
          className="shrink-0 px-2 py-1 rounded-md bg-white/80 border border-gold-200 text-gold-900 hover:bg-white text-[11px] font-semibold"
          aria-label="확인 — 이 알림 다시 보지 않기"
          title="확인 — 이 알림 다시 보지 않기"
        >
          ✓ 확인
        </button>
        <button
          onClick={() => { snoozeBannerToday(); setSnoozed(true) }}
          className="text-gold-700/70 hover:text-gold-900 text-xs px-1"
          aria-label="오늘 숨기기"
          title="오늘 하루만 숨기기"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
