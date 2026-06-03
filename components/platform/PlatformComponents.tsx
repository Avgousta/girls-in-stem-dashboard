
export { DS } from './tokens';
import { DS } from './tokens';
import type { ReactNode } from 'react';

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KPICardProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  color?:   string;
  trend?:   'up' | 'down' | 'neutral';
  href?:    string;
}
export function KPICard({ label, value, sub, color = DS.primary }: KPICardProps) {
  return (
    <div className="flex flex-col gap-1 p-5" style={{ background: DS.surface }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>{label}</p>
      <p className="text-3xl font-black tabular-nums leading-none mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{sub}</p>}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
export function SectionHeading({ label, sub, action }: { label: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: DS.primary }}>{sub}</p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: DS.text }}>{label}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({ eyebrow, title, sub, actions }: {
  eyebrow?: string; title: string; sub?: string; actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: DS.primary }}>{eyebrow}</p>}
        <h1 className="text-3xl font-black tracking-tight" style={{ color: DS.text }}>{title}</h1>
        {sub && <p className="text-sm mt-1" style={{ color: 'rgba(240,238,255,0.6)' }}>{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap items-center">{actions}</div>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', style = {} }: {
  children: ReactNode; className?: string; style?: React.CSSProperties
}) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: DS.surface, border: `1px solid ${DS.border}`, ...style }}>
      {children}
    </div>
  );
}

// ─── Card header ─────────────────────────────────────────────────────────────
export function CardHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
      style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider" style={{ color: DS.textMid }}>{title}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Inline progress bar ──────────────────────────────────────────────────────
export function ProgressBar({ value, color = DS.primary }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
// Status map uses CSS custom properties so colours adapt to the current theme
const STATUS_MAP: Record<string, { bg: string; color: string; dot: string }> = {
  active:    { bg: 'var(--ds-status-active-bg)',   color: 'var(--ds-status-active-text)',   dot: 'var(--ds-status-active-dot)' },
  inactive:  { bg: 'var(--ds-status-inactive-bg)', color: 'var(--ds-status-inactive-text)', dot: 'var(--ds-status-inactive-dot)' },
  high:      { bg: 'var(--ds-status-high-bg)',      color: 'var(--ds-status-high-text)',      dot: 'var(--ds-status-high-dot)' },
  medium:    { bg: 'var(--ds-status-medium-bg)',    color: 'var(--ds-status-medium-text)',    dot: 'var(--ds-status-medium-dot)' },
  low:       { bg: 'var(--ds-status-low-bg)',       color: 'var(--ds-status-low-text)',       dot: 'var(--ds-status-low-dot)' },
  open:      { bg: 'var(--ds-status-high-bg)',      color: 'var(--ds-status-high-text)',      dot: 'var(--ds-status-high-dot)' },
  resolved:  { bg: 'var(--ds-status-active-bg)',    color: 'var(--ds-status-active-text)',    dot: 'var(--ds-status-active-dot)' },
  pending:   { bg: 'var(--ds-status-medium-bg)',    color: 'var(--ds-status-medium-text)',    dot: 'var(--ds-status-medium-dot)' },
  completed: { bg: 'var(--ds-status-active-bg)',    color: 'var(--ds-status-active-text)',    dot: 'var(--ds-status-active-dot)' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = STATUS_MAP[status] || { bg: DS.borderLight, color: DS.textMid, dot: DS.textMuted };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {label || status}
    </span>
  );
}

// ─── Score colour helper ───────────────────────────────────────────────────────
export function scoreColor(v: number) {
  return v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';
}

// ─── Avatar initials ─────────────────────────────────────────────────────────
export function Avatar({ name, size = 9, color = DS.primary }: { name: string; size?: number; color?: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0`}
      style={{ background: `linear-gradient(135deg,${color},${color}cc)` }}>
      {initials}
    </div>
  );
}

// ─── Table wrapper ────────────────────────────────────────────────────────────
export function DataTable({ headers, children, footer }: {
  headers: string[]; children: ReactNode; footer?: ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
      <table className="w-full" style={{ background: DS.surface }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
            {headers.map(h => (
              <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider"
                style={{ color: DS.textMuted }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {footer && (
        <div className="px-5 py-3 text-xs text-center"
          style={{ borderTop: `1px solid ${DS.borderLight}`, color: DS.textMuted, background: 'rgba(255,255,255,0.03)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}

export function TR({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.05)`, ...style }}>{children}</tr>;
}

export function TD({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-5 py-3.5 ${className}`} style={{ color: DS.text }}>
      {children}
    </td>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────
export function ActionButton({ href, label, variant = 'primary', onClick }: {
  href?: string; label: string; variant?: 'primary' | 'secondary' | 'danger'; onClick?: () => void;
}) {
  const styles = {
    primary:   { bg: DS.primary,    color: 'white',         border: DS.primary },
    secondary: { bg: DS.primaryLight, color: DS.primary,    border: DS.primaryBorder },
    danger:    { bg: DS.dangerLight,  color: '#DC2626',      border: '#FECACA' },
  }[variant];

  const cls = "text-sm font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-90";
  const style = { background: styles.bg, color: styles.color, border: `1px solid ${styles.border}` };

  if (href) return <a href={href} className={cls} style={style}>{label}</a>;
  return <button onClick={onClick} className={cls} style={style}>{label}</button>;
}

// ─── Metric strip (KPI row inside a card) ────────────────────────────────────
export function MetricStrip({ metrics }: { metrics: Array<{ label: string; value: string | number; color?: string }> }) {
  return (
    <div className="grid divide-x" style={{
      gridTemplateColumns: `repeat(${metrics.length},1fr)`,
      borderTop: `1px solid ${DS.borderLight}`,
      borderColor: DS.borderLight,
    }}>
      {metrics.map(({ label, value, color = DS.text }) => (
        <div key={label} className="px-4 py-3 text-center" style={{ borderColor: DS.borderLight }}>
          <p className="text-lg font-black tabular-nums" style={{ color }}>{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: DS.textMuted }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="text-center py-20 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold" style={{ color: 'rgba(240,238,255,0.6)' }}>{title}</p>
      {sub && <p className="text-sm mt-1" style={{ color: DS.textMuted }}>{sub}</p>}
    </div>
  );
}
