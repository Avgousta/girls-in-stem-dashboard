import clsx from 'clsx'
import type { Decision } from '@/types'

// ── Decision Badge ────────────────────────────────────────────
const decisionConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Accept:     { label: 'Accept',     color: 'var(--green)', bg: 'var(--green-bg)' },
  Waitlist:   { label: 'Waitlist',   color: 'var(--amber)', bg: 'var(--amber-bg)' },
  Review:     { label: 'Review',     color: 'var(--red)',   bg: 'var(--red-bg)'   },
  Incomplete: { label: 'Incomplete', color: 'var(--slate)', bg: 'var(--slate-bg)' },
}

export function DecisionBadge({ decision }: { decision: string | null }) {
  const cfg = decisionConfig[decision ?? ''] ?? decisionConfig.Incomplete
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

// ── Score Bar ─────────────────────────────────────────────────
export function ScoreBar({
  value,
  max,
  color,
}: {
  value: number | null
  max: number
  color?: string
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0
  const c = color ?? 'var(--accent)'
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 5, background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: c }}
        />
      </div>
    </div>
  )
}

// ── Score Colour helper ───────────────────────────────────────
export function scoreColor(score: number | null): string {
  if (score == null) return 'var(--text3)'
  if (score >= 70)   return 'var(--green)'
  if (score >= 55)   return 'var(--amber)'
  return 'var(--red)'
}

// ── Card ──────────────────────────────────────────────────────
export function Card({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={clsx('rounded-2xl overflow-hidden', className)}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        {title}
      </span>
      {action && (
        <span className="text-xs" style={{ color: 'var(--text2)' }}>
          {action}
        </span>
      )}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  accentColor,
  delay,
}: {
  label: string
  value: string | number
  sub?: string
  accentColor: string
  delay?: number
}) {
  return (
    <div
      className="fade-up rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        animationDelay: `${(delay ?? 0) * 60}ms`,
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: 2, background: accentColor }}
      />
      <div
        className="serif font-medium mb-1"
        style={{ fontSize: 36, color: accentColor, lineHeight: 1 }}
      >
        {value}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {label}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between px-8 py-5"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
    >
      <div>
        <h1 className="serif font-medium" style={{ fontSize: 22, color: 'var(--text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────
export function Btn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #7c6ef5, #c084fc)',
      color: '#fff',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text2)',
      border: '1px solid var(--border2)',
    },
    danger: {
      background: 'var(--red-bg)',
      color: 'var(--red)',
      border: '1px solid rgba(248,113,113,0.2)',
    },
  }
  const pad = size === 'sm' ? '5px 12px' : '8px 16px'
  const fs  = size === 'sm' ? 12 : 13

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
      style={{ ...styles[variant], padding: pad, fontSize: fs }}
    >
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input({
  label,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
          {label}
          {required && <span style={{ color: 'var(--red)' }}> *</span>}
        </label>
      )}
      <input
        {...props}
        className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          fontFamily: 'Figtree, sans-serif',
        }}
        onFocus={e => {
          e.currentTarget.style.border = '1px solid rgba(124,110,245,0.5)'
        }}
        onBlur={e => {
          e.currentTarget.style.border = '1px solid var(--border)'
        }}
      />
    </div>
  )
}

export function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
          {label}
        </label>
      )}
      <select
        {...props}
        className="rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          fontFamily: 'Figtree, sans-serif',
        }}
      >
        {children}
      </select>
    </div>
  )
}

// ── Rank Chip ─────────────────────────────────────────────────
export function RankChip({ rank }: { rank: number }) {
  const isTop3 = rank <= 3
  return (
    <div
      className="mono inline-flex items-center justify-center rounded-lg text-xs font-medium"
      style={{
        width: 28, height: 28,
        background: isTop3
          ? 'linear-gradient(135deg, rgba(124,110,245,0.3), rgba(192,132,252,0.2))'
          : 'rgba(255,255,255,0.04)',
        color:      isTop3 ? 'var(--accent2)' : 'var(--text3)',
        border:     isTop3
          ? '1px solid rgba(124,110,245,0.3)'
          : '1px solid var(--border)',
      }}
    >
      {rank}
    </div>
  )
}

// ── Null-safe score display ───────────────────────────────────
export function ScoreCell({ value }: { value: number | null }) {
  if (value == null)
    return <span className="mono text-xs" style={{ color: 'var(--text3)' }}>—</span>
  return <span className="mono text-xs">{value}</span>
}
