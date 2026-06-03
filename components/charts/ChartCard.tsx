import { cn } from '@/utils';

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
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm p-5', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {loading ? (
        <div className="h-48 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
          <p className="text-xs text-gray-400">Loading chart…</p>
        </div>
      ) : children}
    </div>
  );
}
