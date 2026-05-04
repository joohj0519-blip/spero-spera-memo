export type MemoType = 'note' | 'checklist' | 'todo'

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
}

export const MEMO_TYPE_META: Record<MemoType, { label: string; emoji: string; color: string }> = {
  note: { label: '메모', emoji: '📝', color: 'note' },
  checklist: { label: '체크리스트', emoji: '✅', color: 'check' },
  todo: { label: '할 일', emoji: '🎯', color: 'todo' },
}
