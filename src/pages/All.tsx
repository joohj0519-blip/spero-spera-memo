import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isCompleted, listVisibleMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
import type { Memo, MemoType } from '../types'
import { TYPE_THEME, FACE, CHAR } from '../lib/theme'
import { Brand, FolderStack, RoundButton, SectionLabel, Sheet } from '../components/Folder'
import type { FolderDef } from '../components/Folder'
import { MemoCard } from '../components/MemoCard'
import { SearchIcon } from '../components/Icons'

type Filter = MemoType | 'all'

// 종류 고르기 탭 — 뒤에서 앞으로 한 계단씩 내려오는 서류철. 탭 위치(x)는 고정이고 선택된 것만 맨 앞으로 온다.
const FOLDERS: FolderDef[] = [
  { id: 'todo', label: TYPE_THEME.todo.label, color: TYPE_THEME.todo.bg, fg: TYPE_THEME.todo.fg, x: 266 },
  { id: 'checklist', label: TYPE_THEME.checklist.label, color: TYPE_THEME.checklist.bg, fg: TYPE_THEME.checklist.fg, x: 182 },
  { id: 'note', label: TYPE_THEME.note.label, color: TYPE_THEME.note.bg, fg: TYPE_THEME.note.fg, x: 98 },
  { id: 'all', label: '전체', color: FACE, fg: CHAR, x: 14 },
]

const isFilter = (v: string | null): v is Filter => v === 'all' || v === 'note' || v === 'checklist' || v === 'todo'

export default function All() {
  const [memos, setMemos] = useState<Memo[]>([])
  // 홈의 서류철을 눌러 들어오면 주소에 ?type=todo 처럼 종류가 붙어 온다 → 그 종류로 바로 보여 줌
  const [params, setParams] = useSearchParams()
  const typeParam = params.get('type')
  const filter: Filter = isFilter(typeParam) ? typeParam : 'all'
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    const reload = () => { void listVisibleMemos().then(setMemos) }
    reload()
    return onMemosChanged(reload)
  }, [])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? memos : memos.filter((m) => m.type === filter)
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter((m) =>
        [m.title, m.body, ...m.items.map((i) => i.text)].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      )
    }
    return list
  }, [memos, filter, q])

  // listVisibleMemos 가 이미 '완료는 아래로' 정렬해 주지만, 화면에서는 두 묶음으로 나눠 제목을 따로 붙인다
  const active = filtered.filter((m) => !isCompleted(m))
  const done = filtered.filter((m) => isCompleted(m))

  return (
    <Sheet
      header={
        <>
          <div className="px-5 pt-[30px] flex items-center justify-between gap-3">
            <div className="flex flex-col gap-[3px] min-w-0">
              <Brand />
              <h1 className="m-0 text-[26px] leading-[1.1] font-extrabold">
                모든 메모 <span className="text-[13px] font-semibold text-char-mute">총 {memos.length}개</span>
              </h1>
            </div>
            <RoundButton
              label="검색"
              pressed={searchOpen}
              onClick={() => {
                setSearchOpen((v) => !v)
                if (searchOpen) setQ('')
              }}
            >
              <SearchIcon strokeWidth={2} />
            </RoundButton>
          </div>
          {searchOpen && (
            <div className="px-5 mt-3">
              <label className="flex items-center gap-3 px-4 h-11 rounded-xl bg-sheet border border-line">
                <SearchIcon aria-hidden className="text-char-mute shrink-0" width={18} height={18} />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="제목·내용·항목에서 검색"
                  aria-label="검색어"
                  className="flex-1 min-w-0 bg-transparent text-sm placeholder:text-char-mute"
                />
                {q && (
                  <button onClick={() => setQ('')} className="text-char-mute hover:text-char text-xs p-1" aria-label="지우기">
                    ✕
                  </button>
                )}
              </label>
            </div>
          )}
        </>
      }
      stack={
        <FolderStack
          label="종류별로 보기"
          folders={FOLDERS}
          activeId={filter}
          tabWidth={50}
          onSelect={(id) => setParams(id === 'all' ? {} : { type: id }, { replace: true })}
        />
      }
    >
      {filtered.length === 0 ? (
        <p className="text-center text-char-mute text-sm py-14">{q ? '검색 결과가 없어요.' : '메모가 없어요.'}</p>
      ) : (
        <div className="pb-4">
          {active.length > 0 && (
            <>
              <div className="px-5 pt-3.5 pb-2 flex items-center justify-between">
                <SectionLabel>진행 중 · {active.length}</SectionLabel>
                <span className="text-[11px] text-char-mute">최근 수정 순</span>
              </div>
              <div className="px-4 flex flex-col gap-1.5">
                {active.map((m) => <MemoCard key={m.id} memo={m} />)}
              </div>
            </>
          )}
          {done.length > 0 && (
            <>
              <div className="px-5 pt-4 pb-2 flex items-center gap-2.5">
                <SectionLabel>완료 · {done.length}</SectionLabel>
                <div aria-hidden className="flex-1 h-px bg-line" />
              </div>
              <div className="px-4 flex flex-col gap-[5px]">
                {done.map((m) => <MemoCard key={m.id} memo={m} />)}
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
