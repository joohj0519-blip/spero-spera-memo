import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { listVisibleMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
import type { Memo } from '../types'
import { TYPE_THEME, FACE, CHAR } from '../lib/theme'
import { Brand, FolderStack, RoundButton, Sheet } from '../components/Folder'
import type { FolderDef } from '../components/Folder'
import { MemoCard } from '../components/MemoCard'
import { BackIcon, NextIcon } from '../components/Icons'

type View = 'month' | 'week'

// '월'·'주' 보기 고르기 — 선택한 쪽 서류철이 맨 앞으로 온다
const VIEW_FOLDERS: FolderDef[] = [
  { id: 'month', label: '월', color: FACE, fg: CHAR, x: 14 },
  { id: 'week', label: '주', color: FACE, fg: CHAR, x: 98 },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function CalendarView() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date>(() => new Date())
  const [view, setView] = useState<View>('month')

  useEffect(() => {
    const reload = () => { void listVisibleMemos().then(setMemos) }
    reload()
    return onMemosChanged(reload)
  }, [])

  // 월 보기: 그 달이 걸친 모든 주 / 주 보기: 선택한 날이 속한 한 주 (일요일 시작)
  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(selected, { weekStartsOn: 0 })
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    const out: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
    return out
  }, [view, month, selected])

  // 이전/다음: 월 보기는 한 달씩, 주 보기는 한 주씩 이동
  const go = (dir: number) => {
    if (view === 'week') {
      const nb = addDays(selected, dir * 7)
      setSelected(nb)
      setMonth(nb)
    } else {
      setMonth(addMonths(month, dir))
    }
  }

  const memosByDate = useMemo(() => {
    const map = new Map<string, Memo[]>()
    for (const m of memos) {
      if (!m.dueDate) continue
      const arr = map.get(m.dueDate) ?? []
      arr.push(m)
      map.set(m.dueDate, arr)
    }
    return map
  }, [memos])

  const keyOf = (d: Date) => format(d, 'yyyy-MM-dd')
  const dayMemos = memosByDate.get(keyOf(selected)) ?? []
  const today = new Date()

  // 주 보기 제목: 같은 달이면 '11월 15–21일', 달이 걸치면 '11월 29일–12월 5일'
  const title =
    view === 'month'
      ? format(month, 'yyyy년 M월', { locale: ko })
      : isSameMonth(days[0], days[6])
        ? `${format(days[0], 'M월 d', { locale: ko })}–${format(days[6], 'd일', { locale: ko })}`
        : `${format(days[0], 'M월 d일', { locale: ko })}–${format(days[6], 'M월 d일', { locale: ko })}`

  /** 날짜 아래에 찍는 점 — 그날 메모의 종류 색 (최대 3개) */
  const dots = (d: Date, onDark: boolean) =>
    (memosByDate.get(keyOf(d)) ?? []).slice(0, 3).map((m) => (
      <span key={m.id} className="w-[5px] h-[5px] rounded-full" style={{ background: onDark ? '#F3EBDD' : TYPE_THEME[m.type].bg }} />
    ))

  return (
    <Sheet
      header={
        <div className="px-5 pt-[30px] flex items-center justify-between gap-3">
          <div className="flex flex-col gap-[3px] min-w-0">
            <Brand />
            <h1 className="m-0 text-[26px] leading-[1.1] font-extrabold whitespace-nowrap">{title}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <RoundButton label={view === 'month' ? '이전 달' : '이전 주'} onClick={() => go(-1)}>
              <BackIcon strokeWidth={2.2} />
            </RoundButton>
            <button
              type="button"
              onClick={() => {
                setMonth(new Date())
                setSelected(new Date())
              }}
              className="h-11 px-3.5 rounded-full border border-line bg-face text-[13px] font-bold"
            >
              오늘
            </button>
            <RoundButton label={view === 'month' ? '다음 달' : '다음 주'} onClick={() => go(1)}>
              <NextIcon strokeWidth={2.2} />
            </RoundButton>
          </div>
        </div>
      }
      stack={
        <FolderStack
          label="보기 방식"
          folders={VIEW_FOLDERS.map((f) => (f.id === view ? f : { ...f, color: TYPE_THEME.note.bg }))}
          activeId={view}
          tabWidth={50}
          onSelect={(id) => {
            setView(id as View)
            // 주 보기로 바꿀 때는 지금 보던 달 안의 날짜를 기준으로 삼는다
            if (id === 'week' && !isSameMonth(selected, month)) setSelected(startOfMonth(month))
          }}
        />
      }
    >
      {view === 'month' ? (
        <>
          <div className="px-3.5 pt-2.5">
            <div aria-hidden className="grid grid-cols-7 pb-1.5 text-center text-[11px] font-bold text-char-mute">
              {WEEKDAYS.map((d, i) => (
                <span key={d} className={i === 0 ? 'text-terra-dark' : ''}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map((d) => {
                const dim = !isSameMonth(d, month)
                const isSel = isSameDay(d, selected)
                const isToday = isSameDay(d, today)
                return (
                  <button
                    key={keyOf(d)}
                    type="button"
                    onClick={() => setSelected(d)}
                    aria-label={format(d, 'M월 d일', { locale: ko })}
                    aria-current={isToday ? 'date' : undefined}
                    aria-pressed={isSel}
                    className="h-[46px] flex flex-col items-center gap-0.5 text-[13.5px] font-semibold"
                  >
                    <span
                      className={[
                        'w-[30px] h-[30px] rounded-full grid place-items-center',
                        isSel ? 'bg-char text-paper font-extrabold'
                          : isToday ? 'ring-[1.5px] ring-terra-light text-terra-dark font-extrabold'
                            : dim ? 'text-ink-400'
                              : d.getDay() === 0 ? 'text-terra-dark' : 'text-char',
                      ].join(' ')}
                    >
                      {d.getDate()}
                    </span>
                    <span aria-hidden className="flex gap-[3px] h-[5px]">{dots(d, false)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="px-5 pt-3 pb-2 flex items-center gap-2.5">
            <h2 className="m-0 text-[13px] font-extrabold">{format(selected, 'M월 d일 EEEE', { locale: ko })}</h2>
            <div aria-hidden className="flex-1 h-px bg-line" />
            <span className="text-[11px] text-char-mute">{dayMemos.length}건</span>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-1.5">
            {dayMemos.length === 0 ? (
              <p className="m-0 px-1 py-3 text-sm text-char-mute">이 날짜에 등록된 메모가 없어요.</p>
            ) : (
              dayMemos.map((m) => <MemoCard key={m.id} memo={m} />)
            )}
          </div>
        </>
      ) : (
        <>
          {/* 주 보기: 위에는 일~토 한 줄, 아래에는 요일별 메모를 한 화면에 모두 펼쳐 보여 준다 */}
          <div className="px-3.5 pt-3 grid grid-cols-7 gap-1">
            {days.map((d) => {
              const isSel = isSameDay(d, selected)
              const isToday = isSameDay(d, today)
              return (
                <button
                  key={keyOf(d)}
                  type="button"
                  onClick={() => setSelected(d)}
                  aria-label={format(d, 'M월 d일 EEEE', { locale: ko })}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSel}
                  className={[
                    'h-[66px] rounded-xl flex flex-col items-center justify-center gap-[3px]',
                    isSel ? 'bg-char text-paper' : 'bg-sheet border border-line',
                    !isSel && (isToday || d.getDay() === 0) ? 'text-terra-dark' : '',
                  ].join(' ')}
                >
                  <span className="text-[10.5px] font-bold">{WEEKDAYS[d.getDay()]}</span>
                  <span className="text-base font-extrabold leading-none">{d.getDate()}</span>
                  <span aria-hidden className="flex gap-[3px] h-[5px]">{dots(d, isSel)}</span>
                </button>
              )
            })}
          </div>
          <div className="px-4 pt-3.5 pb-4 flex flex-col">
            {days.map((d) => {
              const list = memosByDate.get(keyOf(d)) ?? []
              const isToday = isSameDay(d, today)
              return (
                <div key={keyOf(d)} className="flex gap-2 py-[7px] border-b border-rule">
                  <div className="w-11 shrink-0 pt-1 flex flex-col items-center gap-px">
                    <span className={['text-[10.5px] font-bold', isToday || d.getDay() === 0 ? 'text-terra-dark' : 'text-char-mute'].join(' ')}>
                      {isToday ? '오늘' : WEEKDAYS[d.getDay()]}
                    </span>
                    <span className={['text-[15px] font-extrabold', isToday ? 'text-terra-dark' : 'text-char'].join(' ')}>
                      {d.getDate()}
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <div className="flex-1 h-[30px] flex items-center text-xs text-char-mute">메모 없음</div>
                  ) : (
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {list.map((m) => <MemoCard key={m.id} memo={m} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Sheet>
  )
}
