import { useEffect, useRef, useState } from 'react'
import type { ReactNode, PointerEvent as RPointerEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { ReminderBanner } from './ReminderBanner'
import { useStandalone } from '../hooks/usePwa'

const FRAME_W = 500
const FRAME_H = 930
const TOP_OFFSET = 16

export function FloatingFrame({ children }: { children: ReactNode }) {
  const isStandalone = useStandalone()
  const location = useLocation()
  const fullWidth = location.pathname.startsWith('/dashboard')
  const embed = new URLSearchParams(location.search).get('embed') === '1'
  const [isDesktop, setIsDesktop] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: TOP_OFFSET })
  const drag = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null)

  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)')
    const apply = () => {
      setIsDesktop(m.matches)
      if (m.matches) {
        setPos({
          x: Math.max(24, (window.innerWidth - FRAME_W) / 2),
          y: TOP_OFFSET,
        })
      }
    }
    apply()
    m.addEventListener('change', apply)
    return () => m.removeEventListener('change', apply)
  }, [])

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!isDesktop) return
    drag.current = { startX: e.clientX, startY: e.clientY, px: pos.x, py: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    const frameH = Math.min(window.innerHeight - 16, FRAME_H)
    setPos({
      x: clamp(drag.current.px + dx, 0, window.innerWidth - FRAME_W),
      y: clamp(drag.current.py + dy, 0, window.innerHeight - frameH),
    })
  }
  const onUp = () => {
    drag.current = null
  }

  // 대시보드 안에 iframe 으로 끼워 넣을 때: 하단 네비·배너 없이 알맹이만
  if (embed) {
    return <div className="min-h-screen flex flex-col w-full">{children}</div>
  }

  // 업무 대시보드: 데스크톱 전체 폭 사용 (작은 플로팅 창 대신)
  if (fullWidth) {
    return (
      <div className="h-screen flex flex-col w-full">
        <ReminderBanner />
        <div className="flex-1 min-h-0">{children}</div>
        <BottomNav />
      </div>
    )
  }

  // 1) 모바일 OR 2) 별도 창으로 설치되어 standalone 으로 실행 중
  //    → 둘 다 윈도우 전체를 메모 화면으로 사용
  if (!isDesktop || isStandalone) {
    return (
      <div className="min-h-screen flex flex-col max-w-[500px] mx-auto w-full">
        <ReminderBanner />
        <div className="flex-1 flex flex-col">{children}</div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div
      className="fixed top-0 left-0 z-20 rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: FRAME_W,
        height: `min(${FRAME_H}px, calc(100vh - 32px))`,
        background:
          'linear-gradient(180deg, #F4F1EA 0%, #EFEADF 60%, #E3DBCE 100%)',
      }}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="shrink-0 h-7 grid place-items-center cursor-grab active:cursor-grabbing select-none touch-none"
        title="드래그해서 이동"
      >
        <div className="w-10 h-1 rounded-full bg-ink-400/30" />
      </div>
      <ReminderBanner />
      <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
