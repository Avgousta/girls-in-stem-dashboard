'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard',  label: 'Overview',        icon: '◈' },
  { href: '/candidates', label: 'Candidates',       icon: '◉', badge: '31' },
  { href: '/scoring',    label: 'Scoring Engine',   icon: '◇' },
  { href: '/reports',    label: 'Reports',          icon: '◻' },
  { href: '/apply',      label: 'Application Form', icon: '▷' },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside
      className="flex flex-col shrink-0 h-screen"
      style={{
        width: 220,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Brand */}
      <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="flex items-center justify-center mb-3 text-lg"
          style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #7c6ef5 0%, #c084fc 100%)',
            borderRadius: 10,
          }}
        >
          ⚗️
        </div>
        <div
          className="serif text-sm leading-tight"
          style={{ color: 'var(--text)', fontSize: 15 }}
        >
          Girls in STEM
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
          Melisizwe Programme
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <div
          className="text-xs font-semibold tracking-widest uppercase mb-2 px-2 pt-3"
          style={{ color: 'var(--text3)', fontSize: 10 }}
        >
          Menu
        </div>
        {nav.map(item => {
          const active = path.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                active
                  ? 'font-medium'
                  : 'hover:bg-white/5'
              )}
              style={{
                color:      active ? '#fff' : 'var(--text2)',
                background: active
                  ? 'linear-gradient(135deg, rgba(124,110,245,0.4) 0%, rgba(192,132,252,0.2) 100%)'
                  : undefined,
                border: active ? '1px solid rgba(124,110,245,0.3)' : '1px solid transparent',
              }}
            >
              <span style={{ fontSize: 13, opacity: 0.8 }}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full mono"
                  style={{
                    background: 'rgba(124,110,245,0.2)',
                    color: 'var(--accent2)',
                    fontSize: 10,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="rounded-xl p-3"
          style={{
            background: 'rgba(124,110,245,0.08)',
            border: '1px solid rgba(124,110,245,0.15)',
          }}
        >
          <div
            className="serif font-medium"
            style={{ color: 'var(--accent2)', fontSize: 22, lineHeight: 1 }}
          >
            2025
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
            Active cohort
          </div>
        </div>
      </div>
    </aside>
  )
}
