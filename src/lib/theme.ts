import type { ComponentType, SVGProps } from 'react'
import type { Memo, MemoType } from '../types'
import { CalendarIcon, CheckIcon, NoteIcon, TargetIcon } from '../components/Icons'

/**
 * 메모 종류별 색·이름·아이콘을 한곳에 모아 둔 표.
 * 홈의 서류철, 목록 줄, 작성 화면 탭이 모두 이 표를 보고 색을 정하므로
 * 나중에 색을 바꾸고 싶을 때 여기 한 군데만 고치면 된다.
 */
export const TYPE_THEME: Record<
  MemoType,
  { label: string; bg: string; fg: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  note: { label: '메모', bg: '#E0CDB0', fg: '#2B2A28', Icon: NoteIcon },
  checklist: { label: '체크리스트', bg: '#A84E2A', fg: '#FBF6EC', Icon: CheckIcon },
  todo: { label: '할 일', bg: '#9AA58C', fg: '#2B2A28', Icon: TargetIcon },
  // 일정 — 제목의 금빛과 같은 계열(황토색). 글자는 차콜이라 읽기 쉬움
  event: { label: '일정', bg: '#D2A75C', fg: '#2B2A28', Icon: CalendarIcon },
}

/** 맨 앞 서류철(속지 면) 색 */
export const FACE = '#FBF6EC'
export const CHAR = '#2B2A28'

/** 'YYYY-MM-DD' 형태의 오늘 날짜 (기기 시간 기준) */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 마감일이 오늘로부터 며칠 지났는지. 0 = 오늘, 양수 = 지남, 음수 = 아직 남음. 날짜가 없으면 null */
export function daysOverdue(memo: Memo): number | null {
  if (!memo.dueDate) return null
  const due = new Date(`${memo.dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - due.getTime()) / (24 * 3600 * 1000))
}
