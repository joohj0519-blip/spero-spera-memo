import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
import {
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
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 shadow-soft">
        <span aria-hidden className="text-base leading-none">🔔</span>
        <Link to="/all" className="flex-1 min-w-0 text-xs text-amber-900 inline-flex items-center gap-1.5">
          <span className={[
            'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
            first.daysOverdue === 0 ? 'bg-amber-200 text-amber-900' : 'bg-rose-200 text-rose-900',
          ].join(' ')}>
            {dueLabel}
          </span>
          <span className="truncate">
            {first.memo.title || '제목 없음'}
          </span>
          {more > 0 && (
            <span className="shrink-0 text-amber-700/80">외 {more}건</span>
          )}
        </Link>
        <button
          onClick={() => { snoozeBannerToday(); setSnoozed(true) }}
          className="text-amber-700/70 hover:text-amber-900 text-xs px-1"
          aria-label="오늘 숨기기"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
