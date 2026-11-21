// 'event'(일정): 날짜만 있는 일정. 시간·반복·알림 없음 — 캘린더에 올려 두는 용도
export type MemoType = 'note' | 'checklist' | 'todo' | 'event'

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface Attachment {
  id: string
  name: string
  mime: string
  size: number
  // base64 data URL — 로컬 IndexedDB 저장용. 추후 Drive 연동 시 driveFileId 로 대체.
  dataUrl: string
}

export interface Memo {
  id: string
  type: MemoType
  title: string
  body: string
  items: ChecklistItem[]
  dueDate?: string // ISO date string (YYYY-MM-DD)
  attachments: Attachment[]
  pinned: boolean
  createdAt: number
  updatedAt: number
  /** todo 의 완료 상태 (체크리스트는 items 로 별도 관리) */
  done?: boolean
  /**
   * 알림 '확인' 표시 — 확인을 누른 시점의 dueDate 를 그대로 적어 둔다.
   * 단순 true/false 가 아니라 날짜를 저장하는 이유:
   * 나중에 날짜를 다른 날로 바꾸면 값이 서로 달라져서 알림이 자동으로 다시 살아나게 하려고.
   * 메모 안에 저장하므로 Drive 동기화로 다른 기기에서도 알림이 다시 뜨지 않는다.
   */
  reminderAck?: string
  /** 그룹(꼬리표) 이름들 — 메모 하나에 여러 개 붙일 수 있다. 없으면 그룹 없음. */
  groups?: string[]
}

export const MEMO_TYPE_META: Record<MemoType, { label: string; emoji: string; color: string }> = {
  note: { label: '메모', emoji: '📝', color: 'note' },
  checklist: { label: '체크리스트', emoji: '✅', color: 'check' },
  todo: { label: '할 일', emoji: '🎯', color: 'todo' },
  event: { label: '일정', emoji: '📅', color: 'gold' },
}
