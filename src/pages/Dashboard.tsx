import { useEffect, useState } from 'react'
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

export default function Dashboard() {
  const [data, setData] = useState<DashData>({})
  const [sel, setSel] = useState(0)

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

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-ink-200/70">
      {/* ① 업무 목록 */}
      <aside className="flex flex-col min-h-0 min-w-0">
        <PanelHead title="업무" />
        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {AREAS.map((area, i) => {
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
        <PanelHead title={a.name} emoji={a.emoji} accent={a.accent} />
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {GROUP_LABELS.map((label, gi) => (
            <Section
              key={gi}
              label={label}
              gi={gi}
              accent={a.accent}
              links={groups[gi]}
              onAdd={(name, url) => void addLink(a.id, gi, name, url)}
              onDel={(idx) => void delLink(a.id, gi, idx)}
            />
          ))}
        </div>
      </section>

      {/* ③ 캘린더 */}
      <section className="flex flex-col min-h-0 min-w-0">
        <PanelHead title="캘린더" />
        <iframe
          title="캘린더"
          src={`${BASE}calendar?embed=1`}
          className="flex-1 w-full border-0 bg-transparent"
        />
      </section>

      {/* ④ 메모 */}
      <section className="flex flex-col min-h-0 min-w-0">
        <PanelHead title="메모" />
        <iframe
          title="메모"
          src={BASE}
          className="flex-1 w-full border-0 bg-transparent"
        />
      </section>
    </div>
  )
}

function PanelHead({ title, emoji, accent }: { title: string; emoji?: string; accent?: string }) {
  return (
    <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-ink-200/70 bg-white/40 backdrop-blur-sm">
      {accent && <span className="w-1.5 h-4 rounded-full" style={{ background: accent }} />}
      {emoji && <span className="text-lg">{emoji}</span>}
      <span className="font-semibold text-ink-900 text-[15px]">{title}</span>
    </div>
  )
}

/* ── 한 그룹(링크 / 서식 / 자료·메모) ── */
function Section({
  label,
  gi,
  accent,
  links,
  onAdd,
  onDel,
}: {
  label: string
  gi: number
  accent: string
  links: DashLink[]
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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="font-semibold text-ink-900 text-sm">{label}</span>
        <span className="ml-auto text-xs font-semibold text-ink-400">{links.length}</span>
      </div>

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

      {links.length === 0 ? (
        <p className="text-center text-xs text-ink-400 py-5">아직 없어요</p>
      ) : (
        <ul>
          {links.map((l, idx) => (
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
