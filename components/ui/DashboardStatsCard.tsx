import { cn } from '@/utils';
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
  green:  { icon: 'bg-mint-400/10',    text: 'text-mint-500' },
  red:    { icon: 'bg-red-50',          text: 'text-red-500' },
  yellow: { icon: 'bg-yellow-50',       text: 'text-yellow-500' },
  purple: { icon: 'bg-brand-50',        text: 'text-brand-700' },
  blue:   { icon: 'bg-blue-50',         text: 'text-blue-600' },
};

export default function DashboardStatsCard({
  title, value, subtitle, icon: Icon, trend, highlight = 'purple', loading
}: Props) {
  const colors = HIGHLIGHT_MAP[highlight];
  const TrendIcon = !trend ? Minus : trend.value > 0 ? TrendingUp : TrendingDown;
  const trendColor = !trend ? 'text-gray-400' : trend.value > 0 ? 'text-mint-600' : 'text-red-500';

  if (loading) return (
    <div className="stat-card animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-32" />
    </div>
  );

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2.5 rounded-xl', colors.icon)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && <p className="text-xs text-gray-400 mt-1">{trend.label}</p>}
      </div>
    </div>
  );
}
