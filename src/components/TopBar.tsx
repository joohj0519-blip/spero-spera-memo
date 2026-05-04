import { Link, useNavigate } from 'react-router-dom'
import { BackIcon } from './Icons'
import type { ReactNode } from 'react'

export function TopBar({
  title,
  subtitle,
  right,
  back,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  back?: boolean
}) {
  const navigate = useNavigate()
  return (
    <header className="px-5 pt-6 pb-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="-ml-2 mt-1 p-2 rounded-full text-ink-700 hover:bg-white/60"
            aria-label="뒤로"
          >
            <BackIcon />
          </button>
        )}
        <div className="min-w-0">
          {subtitle && <div className="text-sm text-ink-500">{subtitle}</div>}
          {title && <h1 className="text-2xl font-bold text-ink-900 truncate">{title}</h1>}
        </div>
      </div>
      {right ?? (
        <Link
          to="/profile"
          className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-200 to-blue-300 grid place-items-center shadow-soft text-blue-900 font-semibold"
          aria-label="프로필"
        >
          나
        </Link>
      )}
    </header>
  )
}
