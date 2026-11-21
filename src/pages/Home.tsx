import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { isCompleted, listVisibleMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
import type { Memo, MemoType } from '../types'
import { TYPE_THEME, FACE, daysOverdue } from '../lib/theme'
import { TabShape, TAB_H } from '../components/Folder'
import { collectGroups } from '../lib/groups'

/* ───────── 제목: 손글씨풍 알록달록 글자 ─────────
   글자마다 크기·색·기울기·높낮이를 조금씩 달리해 손으로 쓴 듯한 느낌을 낸다. [글자, 색, 크기, 기울기(도), 위아래 이동(px)] */
const K = '#2B2A28', T = '#BF5B34', G = '#7D8B6C', Y = '#A87C2C'
const WORD1: Array<[string, string, number, number, number]> = [
  ['S', K, 50, -7, 0], ['P', T, 40, 4, -3], ['E', K, 45, -3, 1], ['R', G, 38, 6, 2], ['O', K, 49, -5, -1],
]
const WORD2: Array<[string, string, number, number, number]> = [
  ['S', Y, 42, 5, 1], ['P', K, 50, -6, -2], ['E', K, 38, 3, 2], ['R', T, 47, -5, -1], ['A', K, 42, 6, 1],
]

function Word({ letters }: { letters: typeof WORD1 }) {
  return (
    <span aria-hidden className="block whitespace-nowrap">
      {letters.map(([ch, color, size, rot, y], i) => (
        <span
          key={i}
          className="inline-block"
          style={{ color, fontSize: size, transform: `translateY(${y}px) rotate(${rot}deg)` }}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}

/* ───────── 서류철 배치 값 ─────────
   각 서류철 띠가 시작하는 높이(px)와 탭 위치. 탭 폭은 글자 수에 맞춰 넉넉히 고정. */
const AREA_H = 356
const TOP = { todo: 44, checklist: 126, note: 208, front: 290 }
/** 주황(체크리스트) 탭: 왼쪽 14px 지점에서 시작, 가운데 칸 116px */
const CHECK_TAB_X = 14
const CHECK_TAB_W = 116

/**
 * 빛이 지나가는 길 — 주황 서류철의 윗선 → 탭 왼쪽 비탈 → 탭 윗면 → 오른쪽 비탈 → 윗선.
 * 화면 폭(w)에 따라 끝 지점이 달라지므로 폭을 받아 그때그때 만든다. (탭 모양 곡선과 같은 숫자를 써야 정확히 따라감)
 */
function orbPath(w: number): string {
  const x0 = CHECK_TAB_X
  const x1 = x0 + 59 + CHECK_TAB_W
  const end = w - 24
  return (
    `M -8 0 L ${x0} 0 C ${x0 + 9} 0 ${x0 + 11} -3 ${x0 + 14} -10 L ${x0 + 21} -27 ` +
    `C ${x0 + 23.5} -33 ${x0 + 26} -36 ${x0 + 30} -36 L ${x1 - 30} -36 ` +
    `C ${x1 - 26} -36 ${x1 - 23.5} -33 ${x1 - 21} -27 L ${x1 - 14} -10 ` +
    `C ${x1 - 11} -3 ${x1 - 9} 0 ${x1} 0 L ${end} 0`
  )
}

const SHADOW: CSSProperties = { filter: 'drop-shadow(0 -2px 3px rgba(43, 42, 40, 0.18))' }

function Folder({
  to, top, color, fg, tab, tabStyle, tabWidth, note, children,
}: {
  to: string
  top: number
  color: string
  fg: string
  tab: ReactNode
  tabStyle: CSSProperties
  tabWidth: number
  note: ReactNode
  children?: ReactNode
}) {
  return (
    <Link to={to} className="absolute inset-x-0 bottom-0" style={{ top, background: color, color: fg, ...SHADOW }}>
      {children}
      <span className="absolute" style={{ top: -(TAB_H - 1), ...tabStyle }}>
        <TabShape color={color} fg={fg} width={tabWidth}>{tab}</TabShape>
      </span>
      <span className="absolute left-6 top-4 text-xs font-medium">{note}</span>
    </Link>
  )
}

const Num = ({ children }: { children: ReactNode }) => (
  <span className="text-[11px] font-semibold tracking-[0.08em]">{children}</span>
)

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([])
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(390)

  useEffect(() => {
    const reload = () => { void listVisibleMemos().then(setMemos) }
    reload()
    return onMemosChanged(reload)
  }, [])

  // 서류철 영역의 실제 폭을 재서 빛이 지나가는 길과 폭죽 위치를 맞춘다 (휴대폰·PC 창 폭이 서로 다르기 때문)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const apply = () => setAreaW(el.clientWidth)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const now = new Date()
  const open = memos.filter((m) => !isCompleted(m))
  const count = {
    note: memos.filter((m) => m.type === 'note').length,
    checklist: open.filter((m) => m.type === 'checklist').length,
    todo: open.filter((m) => m.type === 'todo').length,
  }
  // 요약 띠: 날짜가 있는 할 일·체크리스트 중 아직 안 끝난 것 기준
  const dated = open.filter((m) => m.type !== 'note')
  const dueToday = dated.filter((m) => daysOverdue(m) === 0).length
  const overdue = dated.filter((m) => (daysOverdue(m) ?? -1) > 0).length

  const groups = collectGroups(memos)

  const todo = TYPE_THEME.todo, check = TYPE_THEME.checklist, note = TYPE_THEME.note

  return (
    <div className="flex-1 flex flex-col min-h-full bg-paper">
      {/* ──── 제목 ──── */}
      <header className="shrink-0 px-6 pt-10 pb-5 flex flex-col items-center gap-[22px]">
        <div className="text-[11px] font-semibold tracking-[0.22em] text-char-mute">
          {format(now, 'yyyy.MM.dd · eee', { locale: ko })}
        </div>
        <div className="relative">
          <h1
            aria-label="SPERO SPERA"
            className="m-0 font-hand font-extrabold leading-none tracking-[0.02em] flex items-center gap-[13px] whitespace-nowrap"
          >
            <Word letters={WORD1} />
            <Word letters={WORD2} />
          </h1>
          {/* 낙서 장식: 별 · MEMO 말풍선 · 물결선 · 반짝임 */}
          <svg aria-hidden width="28" height="28" viewBox="0 0 40 40" fill="none" stroke="#C99A2E" strokeWidth="3" strokeLinejoin="round" className="absolute -left-[30px] -top-[18px] -rotate-[10deg]">
            <path d="M20 3 L24 13 L34 9 L29 19 L38 24 L28 26 L30 37 L21 30 L12 37 L13 26 L3 23 L12 18 L7 8 L17 12 Z" />
          </svg>
          <div className="absolute -right-[22px] -top-6 px-[9px] py-1 bg-terra-tint text-terra-ink rounded-[9px] rounded-bl-[2px] text-[11px] font-extrabold tracking-[0.14em] rotate-6">
            MEMO
          </div>
          <svg aria-hidden width="64" height="16" viewBox="0 0 64 16" fill="none" stroke="#7D8B6C" strokeWidth="3" strokeLinecap="round" className="absolute right-1 -bottom-[17px]">
            <path d="M3 9 C8 2 13 2 18 9 S28 16 33 9 S43 2 48 9 S56 14 61 8" />
          </svg>
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BF5B34" strokeWidth="2.6" strokeLinecap="round" className="absolute -left-[26px] -bottom-3">
            <path d="M12 3v5M4 8l4 3M20 8l-4 3" /><circle cx="12" cy="17" r="3.5" />
          </svg>
        </div>
        <p className="m-0 text-xs font-semibold tracking-[0.12em] text-terra-dark">
          DUM SPIRO, SPERO · 숨쉬는 한, 희망한다
        </p>
      </header>

      {/* ──── 겹쳐 쌓인 서류철 (누르면 그 종류의 목록으로 이동) ──── */}
      <div ref={areaRef} className="relative shrink-0 overflow-hidden" style={{ height: AREA_H }}>
        <Folder
          to="/all?type=todo" top={TOP.todo} color={todo.bg} fg={todo.fg}
          tab={<><Num>03</Num>할 일</>} tabStyle={{ right: 14 }} tabWidth={76}
          note={<>오늘의 미션 · 남은 것 <b className="font-extrabold">{count.todo}</b></>}
        />

        {/* 서류철 사이로 삐져나온 메모지 (장식) */}
        <div aria-hidden className="absolute left-[206px] top-[62px] w-[66px] h-[90px] px-[9px] py-3 bg-face rotate-6 shadow-[0_2px_5px_rgba(43,42,40,0.18)] flex flex-col gap-1.5">
          <div className="h-0.5 w-3/5 bg-terra-light" />
          <div className="h-[1.5px] bg-[#B9AE9C]" />
          <div className="h-[1.5px] bg-[#B9AE9C]" />
          <div className="h-[1.5px] w-[70%] bg-[#B9AE9C]" />
        </div>

        <Folder
          to="/all?type=checklist" top={TOP.checklist} color={check.bg} fg={check.fg}
          tab={<><Num>02</Num>체크리스트</>} tabStyle={{ left: CHECK_TAB_X }} tabWidth={CHECK_TAB_W}
          note={<>항목별로 정리 · 진행 중 <b className="font-extrabold">{count.checklist}</b></>}
        >
          {/* 빛 효과: 둥근 빛이 윤곽을 따라 이동 → 끝에서 폭죽처럼 터짐 (자세한 설명은 index.css) */}
          <span aria-hidden className="orb" style={{ offsetPath: `path('${orbPath(areaW)}')` }} />
          <span aria-hidden className="absolute top-0 w-0 h-0 pointer-events-none" style={{ left: areaW - 24 }}>
            {Array.from({ length: 10 }, (_, k) => (
              <span key={k} className="absolute left-0 top-0" style={{ transform: `rotate(${k * 36 + (k % 2 ? 8 : 0)}deg)` }}>
                <span className={k % 2 ? 'spark near' : 'spark'} />
              </span>
            ))}
          </span>
        </Folder>

        <div aria-hidden className="absolute left-[296px] top-[148px] w-[62px] h-[84px] px-[9px] py-2.5 bg-sage-tint -rotate-[7deg] shadow-[0_2px_5px_rgba(43,42,40,0.2)] flex flex-col gap-[7px]">
          {[false, true, false].map((on, i) => (
            <div key={i} className="flex items-center gap-[5px]">
              <div className={['w-2 h-2 shrink-0', on ? 'bg-char' : 'border-[1.5px] border-char'].join(' ')} />
              <div className="flex-1 h-[1.5px] bg-sage-dark" />
            </div>
          ))}
        </div>

        <Folder
          to="/all?type=note" top={TOP.note} color={note.bg} fg={note.fg}
          tab={<><Num>01</Num>메모</>} tabStyle={{ left: 128 }} tabWidth={70}
          note={<>자유롭게 적어두기 · 전체 <b className="font-extrabold">{count.note}</b></>}
        />

        <Link to="/calendar" className="absolute inset-x-0 bottom-0" style={{ top: TOP.front, background: FACE, ...SHADOW }}>
          <span className="absolute" style={{ top: -(TAB_H - 1), right: 14 }}>
            <TabShape color={FACE} fg="#8F3F1F" width={96}>{format(now, 'yyyy · M월')}</TabShape>
          </span>
          <span className="absolute left-6 top-[34px] text-[11px] font-bold tracking-[0.24em] text-char-mute">TODAY</span>
        </Link>

        {/* 맨 앞 서류철을 물고 있는 집게 (장식) */}
        <svg aria-hidden width="46" height="56" viewBox="0 0 46 56" className="absolute left-11 top-[258px] pointer-events-none">
          <path d="M15 30 C8 14 13 4 23 4 C33 4 38 14 31 30" fill="none" stroke="#2B2A28" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M4 28 H42 L39 52 H7 Z" fill="#2B2A28" />
          <rect x="7" y="48" width="32" height="4" fill="#55504A" />
        </svg>
      </div>

      {/* ──── 맨 앞 서류철의 면: 요약 띠 + 새로 쓰기 버튼 ──── */}
      <div className="flex-1 flex flex-col bg-face pb-3">
        <div className="mx-5 grid grid-cols-3 h-[50px] rounded-xl bg-char shrink-0">
          <Stat value={memos.length} label="전체 메모" />
          <Stat value={dueToday} label="오늘 할 일" accent className="border-x border-char-soft" />
          <Stat value={overdue} label="기한 지남" />
        </div>
        <div className="px-5 pt-3 grid grid-cols-3 gap-2.5">
          {(['note', 'checklist', 'todo'] as MemoType[]).map((t) => (
            <NewCard key={t} type={t} />
          ))}
        </div>
        {/* 그룹 — 누르면 '모두' 화면에서 그 그룹의 메모만 모아 본다. 그룹이 없으면 이 줄은 안 보인다.
            그룹이 많아 한 줄에 다 안 들어가면 다음 줄로 넘어간다 (옆으로 밀어 보게 하면 끝이 잘려 보여서) */}
        {groups.length > 0 && (
          <div className="pt-3.5">
            <div className="px-6 text-[11px] font-bold tracking-[0.24em] text-char-mute">GROUP</div>
            <div className="mt-2 px-5 flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <Link
                  key={g.name}
                  to={`/all?group=${encodeURIComponent(g.name)}`}
                  className="shrink-0 h-9 px-3 rounded-full bg-sheet border border-line text-char text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:border-char/40"
                >
                  <span className="max-w-[120px] truncate">#{g.name}</span>
                  <span className="tabular-nums text-[11px] text-char-mute">{g.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ value, label, accent, className = '' }: { value: number; label: string; accent?: boolean; className?: string }) {
  return (
    <div className={['flex flex-col items-center justify-center gap-0.5', className].join(' ')}>
      <div className={['text-base font-bold leading-none tabular-nums', accent ? 'text-[#F0A07E]' : 'text-paper'].join(' ')}>{value}</div>
      <div className="text-[10.5px] text-[#D9CDB9]">{label}</div>
    </div>
  )
}

const NEW_DESC: Record<MemoType, string> = { note: '자유롭게 적기', checklist: '항목별 정리', todo: '오늘의 미션' }

function NewCard({ type }: { type: MemoType }) {
  const t = TYPE_THEME[type]
  return (
    <Link
      to={`/new?type=${type}`}
      aria-label={`${t.label} 새로 쓰기`}
      className="h-[92px] px-2.5 pb-[9px] flex flex-col items-center justify-between rounded-xl bg-paper border border-line text-char hover:border-char/40 active:scale-[0.99] transition-all"
    >
      <span aria-hidden className="w-9 h-9 rounded-b-full grid place-items-center" style={{ background: t.bg, color: t.fg }}>
        <t.Icon width={17} height={17} />
      </span>
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-[13.5px] font-bold">{t.label}</span>
        <span className="text-[11px] text-char-mute">{NEW_DESC[type]}</span>
      </span>
    </Link>
  )
}
