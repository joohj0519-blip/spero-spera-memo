import { NavLink } from 'react-router-dom'
import { HomeIcon, CalendarIcon, GridIcon, UserIcon, BriefcaseIcon } from './Icons'
import type { ComponentType, MouseEvent, SVGProps } from 'react'

type Tab = { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; end?: boolean }

const tabs: Tab[] = [
  { to: '/', label: '홈', Icon: HomeIcon, end: true },
  { to: '/dashboard', label: '업무', Icon: BriefcaseIcon },
  { to: '/calendar', label: '캘린더', Icon: CalendarIcon },
  { to: '/all', label: '모두', Icon: GridIcon },
  { to: '/profile', label: '프로필', Icon: UserIcon },
]

export function BottomNav() {
  // 대시보드 안에 iframe 으로 끼워 넣었을 때는 '업무' 탭 숨김 (재귀 방지)
  const embedded = typeof window !== 'undefined' && window.self !== window.top
  const shown = embedded ? tabs.filter((t) => t.to !== '/dashboard') : tabs

  /* '업무'(대시보드) 탭 —
     대시보드는 가로 5칸 구조라 메모앱 크기(485px)나 설치형 앱 창에서 열면
     칸이 세로로 접혀서 쓰기 불편하다. 그래서 창이 좁거나 설치형으로 실행 중이면
     그 자리에서 이동하지 않고 화면에 꽉 차는 새 창으로 띄운다.
     이미 넓은 창(1024px 이상 브라우저)에서 보고 있으면 기존처럼 그 자리에서 이동. */
  const openDashboard = (e: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === 'undefined') return
    const narrow = window.innerWidth < 1024
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    if (!narrow && !standalone) return

    e.preventDefault()
    const url = `${import.meta.env.BASE_URL}dashboard`
    const w = Math.min(1600, Math.round(window.screen.availWidth * 0.92))
    const h = Math.round(window.screen.availHeight * 0.92)
    const left = Math.round((window.screen.availWidth - w) / 2)
    // 같은 이름('spero-dashboard')을 쓰므로 다시 눌러도 창이 새로 뜨지 않고 기존 창이 앞으로 온다
    const win = window.open(url, 'spero-dashboard', `width=${w},height=${h},left=${left},top=20`)
    if (win) win.focus()
    else window.location.href = url   // 팝업이 차단된 경우 폴백 — 원래대로 그 자리에서 이동
  }

  return (
    <nav className="shrink-0 px-3 safe-bottom pt-1">
      <div className="flex items-center justify-around rounded-xl bg-white/95 backdrop-blur shadow-card border border-ink-200/70 px-2 py-2">
        {shown.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={to === '/dashboard' ? openDashboard : undefined}
            className={({ isActive }) =>
              [
                'flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-2 transition-colors',
                isActive ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  width={22}
                  height={22}
                  className={isActive ? 'fill-ink-900/5' : ''}
                  strokeWidth={isActive ? 2 : 1.6}
                />
                <span className={['text-[11px]', isActive ? 'font-semibold' : 'font-medium'].join(' ')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
