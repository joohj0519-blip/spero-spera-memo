import { NavLink } from 'react-router-dom'
import { HomeIcon, CalendarIcon, GridIcon, UserIcon, BriefcaseIcon } from './Icons'
import type { ComponentType, SVGProps } from 'react'

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
  return (
    <nav className="shrink-0 px-3 safe-bottom pt-1">
      <div className="flex items-center justify-around rounded-xl bg-white/95 backdrop-blur shadow-card border border-ink-200/70 px-2 py-2">
        {shown.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
