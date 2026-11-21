import type { ReactNode } from 'react'

/* ─────────────────────────────────────────────────────────
   서류철(폴더) 탭 — 앱 전체에서 같은 모양을 쓰기 위한 공통 부품
   탭 = [왼쪽 비탈] + [가운데 글자 칸] + [오른쪽 비탈]
   비탈은 아래쪽이 서류철 몸통으로 부드럽게 퍼지고 위쪽 모서리는 둥근 사다리꼴.
   ───────────────────────────────────────────────────────── */

export const TAB_H = 36
/** 비탈 한쪽의 가로 폭 */
export const SLOPE_W = 30

const LEFT = 'M0 36 C9 36 11 33 14 26 L21 9 C23.5 3 26 0 30 0 L30 36 Z'
const RIGHT = 'M30 36 C21 36 19 33 16 26 L9 9 C6.5 3 4 0 0 0 L0 36 Z'

export function TabShape({
  color,
  fg,
  width,
  children,
}: {
  color: string
  fg: string
  /** 가운데 글자 칸의 폭(px). 글자 수와 상관없이 탭 크기를 맞추려고 고정값으로 받는다 */
  width: number
  children: ReactNode
}) {
  return (
    <span className="relative flex items-end" style={{ color: fg }}>
      <svg aria-hidden width={SLOPE_W} height={TAB_H} viewBox="0 0 30 36" className="block shrink-0">
        <path d={LEFT} fill={color} />
      </svg>
      {/* 가운데 칸 — 양옆 -0.5px: 비탈과의 사이에 실금(가는 틈)이 보이는 것을 막으려고 살짝 겹침 */}
      <span style={{ width, height: TAB_H, background: color, margin: '0 -0.5px' }} />
      <svg aria-hidden width={SLOPE_W} height={TAB_H} viewBox="0 0 30 36" className="block shrink-0">
        <path d={RIGHT} fill={color} />
      </svg>
      {/* 글자는 탭 전체 위에 따로 얹는다 — '체크리스트'처럼 긴 이름이 가운데 칸보다 넓어도
          비탈에 가려 잘리지 않고 비탈 위까지 자연스럽게 걸치도록 */}
      <span className="absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap text-[13.5px] font-bold tracking-[0.04em]">
        {children}
      </span>
    </span>
  )
}

export interface FolderDef {
  id: string
  label: ReactNode
  /** 서류철 색 */
  color: string
  /** 탭 글자 색 */
  fg: string
  /** 탭의 왼쪽 위치(px) — 선택이 바뀌어도 탭은 제자리에 있고, 앞뒤 순서만 바뀐다 */
  x: number
}

/**
 * 서류철 여러 장을 위아래로 겹쳐 쌓은 묶음 (홈 화면과 같은 방식).
 * - 선택된 서류철이 맨 앞(가장 아래)으로 온다.
 * - 한 줄에 탭을 욱여넣지 않으므로 글자 수와 상관없이 탭 폭을 똑같이 줄 수 있다.
 */
export function FolderStack({
  folders,
  activeId,
  onSelect,
  tabWidth,
  label,
  step = 24,
  frontStrip = 10,
}: {
  folders: FolderDef[]
  activeId: string
  onSelect?: (id: string) => void
  tabWidth: number
  /** 화면읽기 프로그램용 묶음 이름 */
  label: string
  /** 서류철 한 장이 다음 장 위로 보이는 높이 */
  step?: number
  /** 맨 앞 서류철이 속지 면 위로 보이는 높이 */
  frontStrip?: number
}) {
  // 선택되지 않은 것은 원래 순서대로 뒤에, 선택된 것은 맨 앞에
  const ordered = [...folders.filter((f) => f.id !== activeId), ...folders.filter((f) => f.id === activeId)]
  const height = TAB_H + step * (ordered.length - 1) + frontStrip
  return (
    // overflow-hidden: 서류철 그림자가 묶음 아래(속지 면)로 번져 줄처럼 보이는 것을 막음
    <div role="group" aria-label={label} className="relative shrink-0 overflow-hidden" style={{ height }}>
      {ordered.map((f, i) => {
        const active = f.id === activeId
        const tab = (
          <TabShape color={f.color} fg={f.fg} width={tabWidth}>
            {f.label}
          </TabShape>
        )
        return (
          <div
            key={f.id}
            className="absolute inset-x-0 bottom-0"
            style={{
              top: TAB_H + step * i,
              background: f.color,
              // drop-shadow 는 탭의 사다리꼴 모양을 그대로 따라가므로 종이가 겹쳐 쌓인 느낌이 난다
              filter: 'drop-shadow(0 -2px 3px rgba(43, 42, 40, 0.16))',
            }}
          >
            {onSelect ? (
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(f.id)}
                className="absolute p-0"
                style={{ top: -(TAB_H - 1), left: f.x }}
              >
                {tab}
              </button>
            ) : (
              <div className="absolute" style={{ top: -(TAB_H - 1), left: f.x }}>
                {tab}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** 속지 화면 맨 위의 크림색 제목 영역 + 그 아래 속지 면을 묶는 틀 */
export function Sheet({ header, stack, children }: { header: ReactNode; stack: ReactNode; children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-h-full">
      <div className="bg-paper shrink-0">
        {header}
        <div className="mt-2.5">{stack}</div>
      </div>
      <div className="flex-1 flex flex-col bg-face">{children}</div>
    </div>
  )
}

/** 화면 위쪽의 작은 앱 이름표 (손글씨풍) */
export function Brand() {
  return <div className="font-hand text-[13px] font-extrabold tracking-[0.06em] text-terra-dark">SPERO SPERA</div>
}

/** 둥근 아이콘 버튼 (뒤로, 검색, 이전/다음 등) */
export function RoundButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="w-11 h-11 shrink-0 rounded-full border border-line bg-face grid place-items-center text-char hover:bg-sheet transition-colors"
    >
      {children}
    </button>
  )
}

/** 작은 구역 제목 (띄엄띄엄 쓴 글자) */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-bold tracking-[0.2em] text-char-mute">{children}</span>
}
