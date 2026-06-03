// Shared badge components — importable in any portal (admin, instructor, learner)
import type { ReactNode } from 'react';

export const PRIORITY_CFG = {
  critical: { bg:'#FEF2F2', border:'#FCA5A5', color:'#DC2626', dot:'#EF4444', label:'Critical', icon:'🔴' },
  high:     { bg:'#FFF7ED', border:'#FED7AA', color:'#EA580C', dot:'#F97316', label:'High',     icon:'🟠' },
  medium:   { bg:'#FFFBEB', border:'#FDE68A', color:'#D97706', dot:'#F59E0B', label:'Medium',   icon:'🟡' },
  low:      { bg:'#F0FDF4', border:'#BBF7D0', color:'#16A34A', dot:'#22C55E', label:'Low',      icon:'🟢' },
} as const;

export const STATUS_CFG = {
  open:        { bg:'#FEF2F2', color:'#DC2626', dot:'#EF4444', label:'Open'        },
  in_progress: { bg:'#EFF6FF', color:'#1D4ED8', dot:'#3B82F6', label:'In Progress' },
  resolved:    { bg:'#F0FDF4', color:'#16A34A', dot:'#22C55E', label:'Resolved'    },
} as const;

export const TYPE_CFG: Record<string, { icon:string; label:string; color:string }> = {
  academic:    { icon:'📚', label:'Academic',    color:'#1D4ED8' },
  attendance:  { icon:'📅', label:'Attendance',  color:'#7C3AED' },
  behavioural: { icon:'⚠️', label:'Behavioural', color:'#D97706' },
  personal:    { icon:'💬', label:'Personal',    color:'#DB2777' },
  technical:   { icon:'💻', label:'Technical',   color:'#0891B2' },
  other:       { icon:'📋', label:'Other',       color:'#64748B' },
};

export function PriorityBadge({ priority, size = 'sm' }: { priority: string; size?: 'xs' | 'sm' | 'md' }) {
  const c = PRIORITY_CFG[priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
  const px = size === 'xs' ? 'px-1.5 py-0' : 'px-2 py-0.5';
  const tx = size === 'xs' ? 'text-[10px]' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full border ${px} ${tx}`}
      style={{ background: c.bg, borderColor: c.border, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.open;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

export function TypeTag({ type }: { type: string }) {
  const c = TYPE_CFG[type] ?? TYPE_CFG.other;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${c.color}15`, color: c.color }}>
      {c.icon} {c.label}
    </span>
  );
}

// Compact overdue warning chip
export function OverdueChip() {
  return (
    <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      ⏰ OVERDUE
    </span>
  );
}

// Learner health snapshot (reused in intervention detail)
export function LearnerSnapshot({ att, score, risk }: { att: number; score: number; risk: string }) {
  const c = (v: number, t: number) => v < t ? '#DC2626' : '#16A34A';
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 border border-gray-100 p-3">
      {[
        { label: 'Attendance', value: `${att}%`,  bad: att   < 75 },
        { label: 'Avg Score',  value: `${score}%`,bad: score < 50 },
        { label: 'Risk Level', value: risk,        bad: risk === 'high' },
      ].map(({ label, value, bad }) => (
        <div key={label} className="text-center">
          <p className="text-sm font-black capitalize" style={{ color: bad ? '#DC2626' : '#374151' }}>{value}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// Activity timeline (used in both admin and learner views)
interface TEntry { label: string; sub?: string; color?: string; note?: string }
export function ActivityTimeline({ entries }: { entries: TEntry[] }) {
  return (
    <div className="space-y-0">
      {entries.map((e, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center shrink-0 pt-1">
            <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white"
              style={{ background: e.color ?? '#94A3B8' }} />
            {i < entries.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 my-1 min-h-[16px]" />
            )}
          </div>
          <div className="pb-3 flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 leading-snug">{e.label}</p>
            {e.note && <p className="text-xs text-gray-500 mt-0.5">{e.note}</p>}
            {e.sub  && <p className="text-xs text-gray-400 mt-0.5">{e.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Stat KPI card (shared between admin and instructor KPI strips)
export function KPICard({
  label, value, color, sub, icon: Icon,
}: {
  label: string; value: string | number; color: string; sub?: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums" style={{ color }}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
