import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  highlight?: 'green' | 'red' | 'yellow' | 'purple' | 'blue';
  loading?: boolean;
}

const HIGHLIGHT_MAP = {
  green:  { icon: 'rgba(52,211,153,0.15)',   iconColor: '#34D399' },
  red:    { icon: 'rgba(248,113,113,0.15)',   iconColor: '#F87171' },
  yellow: { icon: 'rgba(251,191,36,0.15)',    iconColor: '#FBBF24' },
  purple: { icon: 'rgba(124,58,237,0.18)',    iconColor: '#A78BFA' },
  blue:   { icon: 'rgba(96,165,250,0.15)',    iconColor: '#60A5FA' },
};

export default function DashboardStatsCard({
  title, value, subtitle, icon: Icon, trend, highlight = 'purple', loading
}: Props) {
  const colors = HIGHLIGHT_MAP[highlight];
  const TrendIcon = !trend ? Minus : trend.value > 0 ? TrendingUp : TrendingDown;
  const trendColor = !trend ? 'rgba(240,238,255,0.4)' : trend.value > 0 ? '#34D399' : '#F87171';

  if (loading) return (
    <div className="stat-card animate-pulse">
      <div className="h-4 rounded w-24 mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-8 rounded w-16 mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-3 rounded w-32" style={{ background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ background: colors.icon }}>
          <Icon className="w-5 h-5" style={{ color: colors.iconColor }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: trendColor }}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold tabular-nums" style={{ color: '#F0EEFF' }}>{value}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(240,238,255,0.5)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.4)' }}>{subtitle}</p>}
        {trend && <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.4)' }}>{trend.label}</p>}
      </div>
    </div>
  );
}
