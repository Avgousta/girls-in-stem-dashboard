'use client';
import type { ReactNode } from 'react';
import { useTheme } from '@/app/(student)/StudentThemeProvider';

// ─── Progress ring (SVG) ─────────────────────────────────────────────────────
export function ProgressRing({
  value, size = 80, stroke = 7, color, label, sublabel
}: {
  value: number; size?: number; stroke?: number;
  color: string; label?: string; sublabel?: string;
}) {
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = Math.min(value, 100) / 100 * circ;
  const cx    = size / 2;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black tabular-nums leading-none" style={{ color }}>
            {value}%
          </span>
          {sublabel && <span className="text-[9px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{sublabel}</span>}
        </div>
      </div>
      {label && <p className="text-xs font-semibold text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>}
    </div>
  );
}

// ─── XP / Level bar ──────────────────────────────────────────────────────────
export function XPBar({ xp, maxXp, level, color }: { xp: number; maxXp: number; level: number; color: string }) {
  const pct = maxXp > 0 ? Math.round((xp / maxXp) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold" style={{ color }}>Level {level}</span>
        <span className="font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{xp} / {maxXp} XP</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      </div>
      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {maxXp - xp} XP to Level {level + 1}
      </p>
    </div>
  );
}

// ─── Themed card ─────────────────────────────────────────────────────────────
export function LCard({ children, className = '', style = {}, onClick }: {
  children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, ...style }}
      onClick={onClick}>
      {children}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
export function SLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>{children}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Badge card ───────────────────────────────────────────────────────────────
export function BadgeCard({ icon, name, description, earned, color, rarity }: {
  icon: string; name: string; description: string;
  earned: boolean; color: string; rarity?: string;
}) {
  const { theme } = useTheme();
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all"
      style={{
        background:  earned ? `${color}15` : theme.cardBg,
        border:      `1px solid ${earned ? color + '40' : theme.cardBorder}`,
        opacity:     earned ? 1 : 0.5,
        filter:      earned ? 'none' : 'grayscale(0.8)',
      }}>
      <div className="text-3xl" style={{ filter: earned ? 'none' : 'grayscale(1)' }}>{icon}</div>
      <div>
        <p className="text-xs font-black" style={{ color: earned ? color : theme.textMuted }}>{name}</p>
        {rarity && (
          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
            style={{ color: earned ? color + '80' : theme.textMuted }}>
            {rarity}
          </p>
        )}
      </div>
      <p className="text-[10px] leading-tight" style={{ color: theme.textMuted }}>{description}</p>
      {earned && (
        <div className="text-[9px] font-black px-2 py-0.5 rounded-full"
          style={{ background: `${color}25`, color }}>✓ Earned</div>
      )}
    </div>
  );
}

// ─── Next step card ───────────────────────────────────────────────────────────
export function NextStepCard({ icon, title, sub, href, accent }: {
  icon: string; title: string; sub: string; href: string; accent: string;
}) {
  const { theme } = useTheme();
  return (
    <a href={href} className="flex items-center gap-3 rounded-2xl p-3.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>{title}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: theme.textMuted }}>{sub}</p>
      </div>
      <span className="text-sm font-bold shrink-0" style={{ color: accent }}>→</span>
    </a>
  );
}

// ─── Score pill ───────────────────────────────────────────────────────────────
export function ScorePill({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const color  = value >= 75 ? '#2DD4A0' : value >= 50 ? '#FCD34D' : '#F87171';
  const textSz = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-xl';
  return (
    <span className={`${textSz} font-black tabular-nums`} style={{ color }}>{value}%</span>
  );
}
