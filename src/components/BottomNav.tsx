import { NavLink } from 'react-router-dom'
import { HomeIcon, CalendarIcon, GridIcon, UserIcon } from './Icons'
import type { ComponentType, SVGProps } from 'react'

type Tab = { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; end?: boolean }

const tabs: Tab[] = [
  { to: '/', label: '홈', Icon: HomeIcon, end: true },
  { to: '/calendar', label: '캘린더', Icon: CalendarIcon },
  { to: '/all', label: '모두', Icon: GridIcon },
  { to: '/profile', label: '프로필', Icon: UserIcon },
]

export function BottomNav() {
  return (
    // 바탕을 '서류철 면' 색으로 두어, 화면 아래쪽과 메뉴가 한 장의 종이처럼 이어지게 함
    <nav aria-label="하단 메뉴" className="shrink-0 px-4 safe-bottom pt-2 bg-face">
      <div className="grid grid-cols-4 h-[66px] rounded-[14px] bg-paper border border-line">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex flex-col items-center justify-center gap-[3px] text-[11px] transition-colors',
                isActive ? 'text-char font-bold' : 'text-char-mute font-medium hover:text-char',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {/* 지금 있는 화면은 아이콘만 주황으로 — 글자색 대비는 유지하면서 위치를 알려 줌 */}
                <Icon
                  width={22}
                  height={22}
                  className={isActive ? 'text-terra-light' : ''}
                  strokeWidth={isActive ? 2 : 1.6}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
