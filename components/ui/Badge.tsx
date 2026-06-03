import { cn, STATUS_COLORS, RISK_COLORS } from '@/utils';
import type { RiskLevel } from '@/types';

interface BadgeProps {
  label: string;
  className?: string;
}

export function StatusBadge({ label, className }: BadgeProps) {
  const colorClass = STATUS_COLORS[label.toLowerCase()] || STATUS_COLORS[label] || 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('badge capitalize', colorClass, className)}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = RISK_COLORS[level];
  return (
    <span className={cn('badge capitalize', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', c.dot)} />
      {level} risk
    </span>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  return <StatusBadge label={grade} />;
}
