import type { Memo } from '../types'

const NOTIFIED_KEY = 'spero:notified'
const SNOOZE_KEY = 'spero:reminderSnooze'

export interface ReminderItem {
  memo: Memo
  /** 0 = 오늘, 1 이상 = 며칠 지남 */
  daysOverdue: number
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isUncompleted(memo: Memo): boolean {
  if (memo.type === 'todo') return !memo.done
  if (memo.type === 'checklist') return memo.items.length === 0 || memo.items.some((i) => !i.checked)
  return false
}

/** 오늘 또는 그 이전 dueDate 를 가진 미완료 todo/checklist 만 추림. 과거가 위로. */
export function getDueReminders(memos: Memo[]): ReminderItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: ReminderItem[] = []
  for (const m of memos) {
    if (!m.dueDate) continue
    if (m.type !== 'todo' && m.type !== 'checklist') continue
    if (!isUncompleted(m)) continue
    const due = new Date(`${m.dueDate}T00:00:00`)
    if (Number.isNaN(due.getTime())) continue
    const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays >= 0) {
      out.push({ memo: m, daysOverdue: diffDays })
    }
  }
  return out.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function loadNotified(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function saveNotified(data: Record<string, string>): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

/** 같은 메모는 같은 날 1회만 시스템 알림 발송. 권한 없으면 조용히 패스. */
export function fireSystemNotifications(reminders: ReminderItem[]): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  const today = todayKey()
  const notified = loadNotified()
  const pending = reminders.filter((r) => notified[r.memo.id] !== today)
  if (pending.length === 0) return
  for (const r of pending) {
    notified[r.memo.id] = today
  }
  saveNotified(notified)
  const iconUrl = `${import.meta.env.BASE_URL}icon-192.png`
  if (pending.length === 1) {
    const r = pending[0]
    const head = r.memo.type === 'todo' ? '🎯 할 일' : '✅ 체크리스트'
    const due = r.daysOverdue === 0 ? '오늘 마감' : `${r.daysOverdue}일 지남`
    try {
      new Notification(`${head} — ${due}`, {
        body: r.memo.title || '제목 없음',
        tag: `spero:${r.memo.id}`,
        icon: iconUrl,
      })
    } catch { /* ignore */ }
  } else {
    try {
      new Notification(`📌 알림 ${pending.length}건 있어요`, {
        body: pending.slice(0, 3).map((r) => r.memo.title || '제목 없음').join(' · '),
        tag: 'spero:multi',
        icon: iconUrl,
      })
    } catch { /* ignore */ }
  }
}

export function snoozeBannerToday(): void {
  try {
    localStorage.setItem(SNOOZE_KEY, todayKey())
  } catch {
    /* ignore */
  }
}

export function isBannerSnoozedToday(): boolean {
  try {
    return localStorage.getItem(SNOOZE_KEY) === todayKey()
  } catch {
    return false
  }
}
