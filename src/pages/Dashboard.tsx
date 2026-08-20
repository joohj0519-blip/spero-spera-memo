import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { onMemosChanged } from '../lib/sync'
import { ensureInit, isSignedIn, signIn } from '../lib/drive'
import {
  AREAS,
  GROUP_LABELS,
  GROUP_TAGS,
  emptyArea,
  getDashboard,
  saveDashboard,
  classify,
  uploadDashFile,
  openDashFile,
  removeDashFile,
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
  const [signedIn, setSignedIn] = useState(false)

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

  /* 첨부파일은 드라이브에서 받아와야 하므로 구글 로그인이 살아 있어야 한다.
     토큰은 1시간이면 만료되는데, 만료 뒤 몰래 갱신하는 방식은 브라우저가
     작은 창을 막아 실패한다 → 로그인 상태를 계속 지켜보고, 풀렸으면
     사용자가 직접 누를 로그인 버튼을 내어 준다. */
  useEffect(() => {
    let alive = true
    const check = () => { if (alive) setSignedIn(isSignedIn()) }
    void ensureInit().then(check).catch(() => { /* 라이브러리 로딩 실패는 아래 버튼으로 알게 된다 */ })
    const timer = setInterval(check, 20_000)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  async function doSignIn() {
    try {
      await signIn()
    } catch (e) {
      alert(e instanceof Error ? e.message : '로그인에 실패했습니다.')
    }
    setSignedIn(isSignedIn())
  }

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
    const gone = cur[gi][idx]
    cur[gi] = cur[gi].filter((_, i) => i !== idx)
    const next = { ...data, [areaId]: cur }
    setData(next)
    await saveDashboard(next)
    // 첨부파일이면 드라이브에 올려 둔 실제 파일도 같이 정리
    if (gone) await removeDashFile(gone)
  }

  /** 고른 파일들을 드라이브에 올려 목록에 붙인다.
   *  label — 이름 칸에 적어 둔 이름. 파일 한 개일 때만 그 이름을 쓴다
   *  (여러 개면 어느 것에 붙일지 알 수 없으므로 각자 파일 이름을 쓴다). */
  async function addFiles(areaId: string, gi: number, files: File[], label = '') {
    const one = files.length === 1 ? label.trim() : ''
    const added = []
    for (const f of files) {
      try {
        // 올리는 칸에 따라 이름 앞에 '[서식] ' · '[자료] ' 가 붙는다
        added.push(await uploadDashFile(f, GROUP_TAGS[gi] ?? '', one))
      } catch (e) {
        alert(e instanceof Error ? e.message : '파일을 올리지 못했습니다.')
        // 로그인이 풀린 게 원인일 수 있으니 단추를 바로 로그인 모양으로 바꿔 준다
        setSignedIn(isSignedIn())
      }
    }
    if (added.length === 0) return
    // 올리는 데 시간이 걸려 그 사이 다른 곳이 바뀌었을 수 있으니 저장본을 다시 읽어 합친다
    const fresh = await getDashboard()
    const cur = (fresh[areaId] ?? emptyArea()).map((g) => g.slice()) as AreaData
    cur[gi] = [...cur[gi], ...added]
    const next = { ...fresh, [areaId]: cur }
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
    // ① 업무 목록은 이름만 있으면 되니 0.75fr 로 좁게,
    // ②선택업무·③공통업무·④캘린더 는 1fr 씩으로 서로 폭을 같게 맞춘다.
    <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(380px,520px)] divide-y lg:divide-y-0 lg:divide-x divide-ink-200/70">
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
                    // 칸이 좁아진 만큼 줄도 같이 줄인다 (아이콘·여백·글자)
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[13px] leading-tight transition-colors',
                    on ? 'bg-white shadow-soft font-semibold text-ink-900' : 'text-ink-600 hover:bg-white/60',
                  ].join(' ')}
                  style={on ? { boxShadow: `inset 3px 0 0 ${area.accent}` } : undefined}
                >
                  <span
                    className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-[15px]"
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
              folded={!!collapsed[`${a.id}:${gi}`]}
              onFold={() => toggle(`${a.id}:${gi}`)}
              onAdd={(name, url) => void addLink(a.id, gi, name, url)}
              onDel={(idx) => void delLink(a.id, gi, idx)}
              // 첨부파일은 '서식'·'자료·메모' 칸에만 (링크 칸은 주소만 모으는 곳)
              onAddFiles={gi === 0 ? undefined : (fs, label) => addFiles(a.id, gi, fs, label)}
              signedIn={signedIn}
              onSignIn={doSignIn}
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
  onAddFiles,
  signedIn,
  onSignIn,
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
  /** 있으면 이 칸에 첨부파일 올리기 버튼이 생긴다 */
  onAddFiles?: (files: File[], label: string) => Promise<void>
  signedIn?: boolean
  onSignIn?: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickFiles = async (list: FileList | null) => {
    if (!list || list.length === 0 || !onAddFiles) return
    setBusy(true)
    try {
      // 이름 칸에 적어 둔 이름을 그대로 첨부파일 이름으로 쓴다.
      // (이러지 않으면 이름을 살리려고 '저장'까지 눌러 줄이 두 개가 된다)
      await onAddFiles(Array.from(list), name)
      setName('')
      setUrl('')
    } finally {
      setBusy(false)
    }
  }

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
        {/* 접기 표시 삼각형 — 11px 는 너무 작다는 의견 반영해 22px(2배)로 키움 */}
        <span className="text-[22px] leading-none w-5 shrink-0 -mt-0.5" style={{ color: headText(accent) }} aria-hidden>
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
        {onAddFiles && (
          <>
            <button
              // 로그인이 풀렸으면 파일 고르기 대신 로그인부터. 누른 그 순간에
              // 로그인 창을 띄워야 브라우저가 창을 막지 않는다.
              onClick={() => (signedIn ? fileRef.current?.click() : void onSignIn?.())}
              disabled={busy}
              className="w-full rounded-lg border border-dashed py-2 text-[13px] font-semibold bg-white/70 hover:bg-white disabled:opacity-60 transition-colors"
              style={{ color: headText(accent), borderColor: accent }}
            >
              {busy
                ? '올리는 중…'
                : signedIn
                  ? '📎 파일 첨부 (개당 20MB)'
                  : '🔐 구글 로그인하고 첨부하기'}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void pickFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {signedIn && (
              <p className="text-[11px] text-ink-400 leading-snug px-0.5">
                위 이름 칸을 적고 파일을 고르면 <b className="font-semibold">그 이름</b>으로 저장됩니다.
                비워 두면 파일 이름 그대로. (여러 개를 한 번에 고르면 각자 파일 이름)
              </p>
            )}
          </>
        )}
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

function Row({ link }: { link: DashLink }) {
  const [busy, setBusy] = useState(false)
  // 메모는 기본적으로 한 줄(제목)만. 눌러야 전체가 펼쳐진다.
  const [open, setOpen] = useState(false)
  const icon =
    link.type === 'file' ? '📎' : link.type === 'folder' ? '📁' : link.type === 'memo' ? '📝' : '🔗'
  // 첨부파일도 url 이 비어 있으므로 'file' 은 먼저 빼 줘야 메모로 오인하지 않는다
  const isMemo = link.type !== 'file' && (link.type === 'memo' || !link.url)
  const inner = (
    <>
      <span className="text-[15px] shrink-0">{icon}</span>
      <span
        className={`flex-1 min-w-0 text-sm text-ink-900 ${isMemo && !open ? 'truncate' : 'break-all'}`}
      >
        {link.name}
      </span>
      {link.type === 'file' && (
        <span className="shrink-0 text-[11px] text-ink-400 tabular-nums">
          {busy ? '여는 중…' : formatBytes(link.size ?? 0)}
        </span>
      )}
    </>
  )
  const cls = 'flex-1 flex items-center gap-2.5 px-4 py-3 min-w-0 hover:bg-ink-100/40 transition-colors'

  // 첨부파일 — 눌렀을 때 드라이브에서 원본을 받아 열어 준다
  if (link.type === 'file') {
    return (
      <button
        className={`${cls} text-left disabled:opacity-60`}
        disabled={busy}
        title={`${link.name} — 눌러서 열기`}
        onClick={async () => {
          setBusy(true)
          try {
            await openDashFile(link)
          } catch (e) {
            alert(e instanceof Error ? e.message : '파일을 열지 못했습니다.')
          } finally {
            setBusy(false)
          }
        }}
      >
        {inner}
      </button>
    )
  }

  // 메모 — 한 줄로 줄여 두고, 누르면 전체가 펼쳐진다 (마우스를 올려도 전체가 보인다)
  if (isMemo) {
    return (
      <button
        className={`${cls} text-left`}
        title={link.name}
        onClick={() => setOpen((o) => !o)}
      >
        {inner}
      </button>
    )
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
