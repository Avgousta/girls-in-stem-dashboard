import { cn } from '@/utils';
import { DS } from '@/components/platform/tokens';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  loading?: boolean;
}

export default function ChartCard({ title, subtitle, children, className, actions, loading }: Props) {
  return (
    <div className={cn('rounded-2xl p-5', className)}
      style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: DS.text }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {loading ? (
        <div className="h-48 rounded-lg animate-pulse flex items-center justify-center"
          style={{ background: DS.surfaceHover }}>
          <p className="text-xs" style={{ color: DS.textMuted }}>Loading chart…</p>
        </div>
      ) : children}
    </div>
  );
}
