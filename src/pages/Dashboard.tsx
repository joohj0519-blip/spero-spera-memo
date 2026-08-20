import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { onMemosChanged } from '../lib/sync'
import {
  AREAS,
  GROUP_LABELS,
  emptyArea,
  getDashboard,
  saveDashboard,
  classify,
} from '../lib/dashboard'
import type { AreaData, DashData, DashLink } from '../lib/dashboard'

const BASE = import.meta.env.BASE_URL
const COMMON_ID = '__common__'   // 특정 업무에 속하지 않는 공통 링크
const COMMON_ACCENT = '#b5883c'  // 허니 앰버(포인트)
// 헤드가 흰색 반투명이라 구분이 안 된다는 의견 반영 —
// 색이 없던 세 칸(업무 목록·캘린더·메모)도 각자 색을 갖게 함.
// 캘린더 = 로즈(check 계열), 메모 = 올리브(note 계열) 로 앱의 기존 색 의미와 맞췄다.
const LIST_ACCENT = '#4A3A30'   // 업무 목록 — 진한 에스프레소(ink-700)
const CAL_ACCENT  = '#9B756E'   // 캘린더 — Rose Bare
const MEMO_ACCENT = '#7B745B'   // 메모 — Sagebound

/* 어떤 그룹을 접어뒀는지는 기기별 취향이라 Drive 동기화 대상이 아니다 → 브라우저에만 저장 */
const COLLAPSE_KEY = 'spero.dash.collapsed'
function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

export default function Dashboard() {
  const [data, setData] = useState<DashData>({})
  const [sel, setSel] = useState(0)
  const [areaQuery, setAreaQuery] = useState('')
  const [detailQuery, setDetailQuery] = useState('')
  const [commonQuery, setCommonQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed)

  // 접은 상태가 새로고침 후에도 유지되도록 저장
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed)) } catch { /* 저장 실패는 무시 */ }
  }, [collapsed])

  const toggle = (key: string) => setCollapsed((s) => ({ ...s, [key]: !s[key] }))
  const setMany = (keys: string[], v: boolean) =>
    setCollapsed((s) => {
      const n = { ...s }
      keys.forEach((k) => { n[k] = v })
      return n
    })

  useEffect(() => {
    const reload = () => { void getDashboard().then(setData) }
    reload()
    return onMemosChanged(reload)
  }, [])

  const areaData = (id: string): AreaData => data[id] ?? emptyArea()

  async function addLink(areaId: string, gi: number, name: string, rawUrl: string) {
    const { url, type } = classify(rawUrl)
    let nm = name.trim()
    if (!nm && !url) return
    if (!nm) nm = url
    const cur = areaData(areaId).map((g) => g.slice()) as AreaData
    cur[gi] = [...cur[gi], { name: nm, url, type }]
    const next = { ...data, [areaId]: cur }
    setData(next)
    await saveDashboard(next)
  }

  async function delLink(areaId: string, gi: number, idx: number) {
    const cur = areaData(areaId).map((g) => g.slice()) as AreaData
    cur[gi] = cur[gi].filter((_, i) => i !== idx)
    const next = { ...data, [areaId]: cur }
    setData(next)
    await saveDashboard(next)
  }

  const a = AREAS[sel]
  const groups = areaData(a.id)
  // 접기 키 — 업무마다 따로 기억한다 (방과후학교의 '링크'와 교과서의 '링크'는 별개)
  const detailKeys = GROUP_LABELS.map((_, gi) => `${a.id}:${gi}`)
  const detailAllFolded = detailKeys.every((k) => collapsed[k])
  const commonKey = `${COMMON_ID}:0`

  return (
    // 다섯 칸을 똑같이 1/5 씩 나누면(grid-cols-5) 맨 오른쪽 메모 칸이 좁아서
    // 메모 화면의 '메모/체크리스트/할 일' 버튼 글자가 줄바꿈된다.
    // 메모 칸은 앱 본체 폭(485px)이 들어갈 만큼 넉넉히 잡고(380~520px),
    // 나머지 네 칸이 남은 폭을 비율로 나눠 갖게 한다.
    <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(380px,520px)] divide-y lg:divide-y-0 lg:divide-x divide-ink-200/70">
      {/* ① 업무 목록 */}
      <aside className="flex flex-col min-h-0 min-w-0">
        <PanelHead title="업무" accent={LIST_ACCENT} />
        <SearchBar value={areaQuery} onChange={setAreaQuery} placeholder="업무 검색" />
        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {AREAS.map((area, i) => ({ area, i }))
            .filter(({ area }) => !areaQuery || area.name.toLowerCase().includes(areaQuery.toLowerCase()))
            .map(({ area, i }) => {
            const on = i === sel
            return (
              <li key={area.id}>
                <button
                  onClick={() => setSel(i)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                    on ? 'bg-white shadow-soft font-semibold text-ink-900' : 'text-ink-600 hover:bg-white/60',
                  ].join(' ')}
                  style={on ? { boxShadow: `inset 3px 0 0 ${area.accent}` } : undefined}
                >
                  <span
                    className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-base"
                    style={{ background: area.soft }}
                  >
                    {area.emoji}
                  </span>
                  <span>{area.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* ② 선택한 업무 상세 */}
      <section className="flex flex-col min-h-0 min-w-0 bg-white/15">
        <PanelHead
          title={a.name}
          emoji={a.emoji}
          accent={a.accent}
          right={<FoldAllBtn folded={detailAllFolded} accent={a.accent} onClick={() => setMany(detailKeys, !detailAllFolded)} />}
        />
        <SearchBar value={detailQuery} onChange={setDetailQuery} placeholder={`${a.name} 검색`} />
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {GROUP_LABELS.map((label, gi) => (
            <Section
              key={gi}
              label={label}
              gi={gi}
              accent={a.accent}
              links={groups[gi]}
              query={detailQuery}
              folded={!!collapsed[`:`]}
              onFold={() => toggle(`:`)}
              onAdd={(name, url) => void addLink(a.id, gi, name, url)}
              onDel={(idx) => void delLink(a.id, gi, idx)}
            />
          ))}
        </div>
      </section>

      {/* ③ 공통 업무 링크 (한가운데) */}
      <section className="flex flex-col min-h-0 min-w-0 bg-white/15">
        <PanelHead
          title="공통 업무"
          emoji="⭐"
          accent={COMMON_ACCENT}
          right={<FoldAllBtn folded={!!collapsed[commonKey]} accent={COMMON_ACCENT} onClick={() => toggle(commonKey)} />}
        />
        <SearchBar value={commonQuery} onChange={setCommonQuery} placeholder="공통 링크 검색" />
        <div className="flex-1 overflow-y-auto p-3">
          <Section
            label="공통 링크"
            gi={0}
            accent={COMMON_ACCENT}
            links={areaData(COMMON_ID)[0]}
            query={commonQuery}
            folded={!!collapsed[commonKey]}
            onFold={() => toggle(commonKey)}
            onAdd={(name, url) => void addLink(COMMON_ID, 0, name, url)}
            onDel={(idx) => void delLink(COMMON_ID, 0, idx)}
          />
        </div>
      </section>

      {/* ④ 캘린더 */}
      <section className="flex flex-col min-h-0 min-w-0">
        <PanelHead title="캘린더" emoji="📅" accent={CAL_ACCENT} />
        <iframe
          title="캘린더"
          src={`${BASE}calendar?embed=1`}
          className="flex-1 w-full border-0 bg-transparent"
        />
      </section>

      {/* ⑤ 메모 */}
      <section className="flex flex-col min-h-0 min-w-0">
        <PanelHead title="메모" emoji="📝" accent={MEMO_ACCENT} />
        <iframe
          title="메모"
          src={BASE}
          className="flex-1 w-full border-0 bg-transparent"
        />
      </section>
    </div>
  )
}

/* ── 헤드 색 계산 ───────────────────────────────────────────
   업무마다 accent 색(진한 원색)이 하나씩 정해져 있는데, 이 색을
   글자·배경에 그대로 쓰면 배경은 너무 진하고 글자는 너무 옅다.
   그래서 흰색/먹색과 섞어 (1) 옅은 배경 틴트 (2) 진한 글자색 두 가지를 만든다.
   Tailwind 클래스로는 런타임 색을 못 만들기 때문에 계산식으로 처리. */
function mix(hex: string, t: [number, number, number], ratio: number) {
  const h = hex.replace('#', '')
  const p = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  const v = p.map((c, i) => Math.round(c + (t[i] - c) * ratio))
  return `rgb(${v[0]}, ${v[1]}, ${v[2]})`
}
// 배경 틴트 — 각 칸의 색을 흰색에 26% 섞은 값(= 흰색 쪽으로 74% 당김).
// 색은 알아볼 수 있으면서 눈이 피로하지 않은 선.
const headTint = (hex: string) => mix(hex, [255, 255, 255], 0.74)
// 글자 — 틴트 배경 위에서 대비가 나오도록 먹색 쪽으로 35% 당겨 진하게.
const headText = (hex: string) => mix(hex, [36, 27, 22], 0.35)

function PanelHead({
  title,
  emoji,
  accent = LIST_ACCENT,
  right,
}: {
  title: string
  emoji?: string
  accent?: string
  right?: ReactNode
}) {
  return (
    <div
      className="shrink-0 flex items-center gap-2 px-4 h-12 border-b-2"
      style={{ background: headTint(accent), borderBottomColor: accent }}
    >
      <span className="w-1.5 h-5 rounded-full shrink-0" style={{ background: accent }} />
      {emoji && <span className="text-lg">{emoji}</span>}
      <span className="font-bold text-[15px] truncate" style={{ color: headText(accent) }}>{title}</span>
      {right && <span className="ml-auto shrink-0">{right}</span>}
    </div>
  )
}

/** 칸 안의 그룹을 한 번에 접고 펴는 버튼 */
function FoldAllBtn({ folded, accent, onClick }: { folded: boolean; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={folded ? '전부 펴기' : '전부 접기'}
      className="px-2.5 py-1 rounded-lg text-[12px] font-bold border bg-white/70 hover:bg-white transition-colors"
      style={{ color: headText(accent), borderColor: accent }}
    >
      {folded ? '▸ 전부 펴기' : '▾ 전부 접기'}
    </button>
  )
}

/* ── 한 그룹(링크 / 서식 / 자료·메모) ── */
function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="shrink-0 px-3 pt-2 pb-1">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">🔍</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-ink-200 bg-white/80 pl-8 pr-3 py-1.5 text-[13px] text-ink-900 outline-none focus:border-ink-400 transition-colors placeholder:text-ink-400"
        />
      </div>
    </div>
  )
}

function Section({
  label,
  gi,
  accent,
  links,
  query = '',
  folded,
  onFold,
  onAdd,
  onDel,
}: {
  label: string
  gi: number
  accent: string
  links: DashLink[]
  query?: string
  folded: boolean
  onFold: () => void
  onAdd: (name: string, url: string) => void
  onDel: (idx: number) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const submit = () => {
    onAdd(name, url)
    setName('')
    setUrl('')
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  const inputCls =
    'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-400 transition-colors placeholder:text-ink-400'

  return (
    <section className="rounded-xl bg-white/90 border border-ink-200/80 shadow-soft overflow-hidden">
      <button
        onClick={onFold}
        title={folded ? '펴기' : '접기'}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-b-2 text-left"
        style={{ background: headTint(accent), borderBottomColor: accent }}
      >
        <span className="w-1.5 h-4 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[11px] w-3 shrink-0" style={{ color: headText(accent) }} aria-hidden>
          {folded ? '▸' : '▾'}
        </span>
        <span className="font-bold text-sm" style={{ color: headText(accent) }}>{label}</span>
        {/* 개수 — 회색 숫자라 잘 안 보여서 같은 색 알약 배지로 */}
        <span
          className="ml-auto text-[11px] font-bold text-white px-2 py-0.5 rounded-full tabular-nums"
          style={{ background: accent }}
        >
          {links.length}
        </span>
      </button>

      {!folded && (
        <>
      <div className="px-3 py-3 space-y-2 border-b border-ink-100 bg-ink-100/30">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKey}
          placeholder="이름"
          className={inputCls}
        />
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={onKey}
            placeholder={gi === 2 ? '주소 (메모는 비워도 됨)' : '주소 붙여넣기'}
            className={inputCls}
          />
          <button
            onClick={submit}
            className="shrink-0 px-4 rounded-lg text-white text-sm font-semibold active:scale-95 transition-transform"
            style={{ background: accent }}
          >
            저장
          </button>
        </div>
      </div>

      {(() => {
        if (links.length === 0) {
          return <p className="text-center text-xs text-ink-400 py-5">아직 없어요</p>
        }
        const q = query.trim().toLowerCase()
        const shown = links
          .map((l, idx) => ({ l, idx }))
          .filter(({ l }) => !q || l.name.toLowerCase().includes(q))
        if (shown.length === 0) {
          return <p className="text-center text-xs text-ink-400 py-5">검색 결과가 없어요</p>
        }
        return (
          <ul>
            {shown.map(({ l, idx }) => (
              <li key={idx} className="flex items-center border-t border-ink-100 first:border-t-0">
                <Row link={l} />
                <button
                  onClick={() => onDel(idx)}
                  aria-label="삭제"
                  className="shrink-0 px-3 py-3 text-ink-300 hover:text-check-600 transition-colors text-sm"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )
      })()}
        </>
      )}
    </section>
  )
}

function Row({ link }: { link: DashLink }) {
  const icon = link.type === 'folder' ? '📁' : link.type === 'memo' ? '📝' : '🔗'
  const inner = (
    <>
      <span className="text-[15px] shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 break-all text-sm text-ink-900">{link.name}</span>
    </>
  )
  const cls = 'flex-1 flex items-center gap-2.5 px-4 py-3 min-w-0 hover:bg-ink-100/40 transition-colors'

  if (link.type === 'memo' || !link.url) {
    return <div className={cls}>{inner}</div>
  }
  return (
    <a
      className={cls}
      href={link.url}
      target={link.type === 'web' ? '_blank' : undefined}
      rel={link.type === 'web' ? 'noopener noreferrer' : undefined}
    >
      {inner}
    </a>
  )
}
