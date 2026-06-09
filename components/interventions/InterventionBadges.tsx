// Shared intervention badge + sub-components
// All colours reference DS tokens (CSS vars) so dark/light theme works everywhere.
import type { ReactNode } from 'react';
import { DS } from '@/components/platform/tokens';
import {
  BookOpen, CalendarCheck2, AlertOctagon, MessageCircle,
  Monitor, FileText, TrendingUp, TrendingDown, Minus,
  Clock, CheckCircle2, AlertTriangle, Activity,
} from 'lucide-react';

// ─── Priority config ──────────────────────────────────────────────────────────
export const PRIORITY_CFG = {
  critical: { color:'#EF4444', bgVar:'var(--ds-danger-light)', label:'Critical', dotColor:'#EF4444' },
  high:     { color:'#F97316', bgVar:'rgba(249,115,22,0.15)',  label:'High',     dotColor:'#F97316' },
  medium:   { color:'#FBBF24', bgVar:'var(--ds-warn-light)',   label:'Medium',   dotColor:'#FBBF24' },
  low:      { color:'#34D399', bgVar:'var(--ds-success-light)',label:'Low',      dotColor:'#34D399' },
} as const;

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CFG = {
  open:        { bgVar:'var(--ds-danger-light)',  color:'var(--ds-danger)',  dot:'var(--ds-danger)',  label:'Open'        },
  in_progress: { bgVar:'var(--ds-primary-light)', color:DS.primary,          dot:DS.primary,          label:'In Progress' },
  resolved:    { bgVar:'var(--ds-success-light)', color:'var(--ds-success)', dot:'var(--ds-success)', label:'Resolved'    },
} as const;

// ─── Type config (Lucide icons — no emoji) ────────────────────────────────────
export const TYPE_CFG: Record<string, { Icon: React.ElementType; label:string; color:string }> = {
  academic:    { Icon: BookOpen,        label:'Academic',    color:'#60A5FA' },
  attendance:  { Icon: CalendarCheck2,  label:'Attendance',  color:'#A78BFA' },
  behavioural: { Icon: AlertOctagon,    label:'Behavioural', color:'#FBBF24' },
  personal:    { Icon: MessageCircle,   label:'Personal',    color:'#F472B6' },
  technical:   { Icon: Monitor,         label:'Technical',   color:'#22D3EE' },
  other:       { Icon: FileText,        label:'Other',       color:'var(--ds-text-muted)' },
};

// ─── SLA days per priority ────────────────────────────────────────────────────
export const SLA_DAYS: Record<string, number> = {
  critical: 1,
  high:     3,
  medium:   7,
  low:      14,
};

// ─── Badge components ─────────────────────────────────────────────────────────

export function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: c.bgVar, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dotColor }} />
      {c.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.open;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: c.bgVar, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

export function TypeTag({ type }: { type: string }) {
  const c = TYPE_CFG[type] ?? TYPE_CFG.other;
  const { Icon } = c;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={{ background: `${c.color}18`, color: c.color }}>
      <Icon className="w-3 h-3 shrink-0" />
      {c.label}
    </span>
  );
}

// ─── SLA Chip ─────────────────────────────────────────────────────────────────
// Shows time remaining (or overdue) against the SLA for this priority.
export function SLAChip({ priority, createdAt }: { priority: string; createdAt: string }) {
  const slaDays  = SLA_DAYS[priority] ?? 7;
  const deadline = new Date(createdAt);
  deadline.setDate(deadline.getDate() + slaDays);
  const msLeft   = deadline.getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  const hoursLeft = Math.ceil(msLeft / 3_600_000);

  const overdue  = daysLeft < 0;
  const urgent   = !overdue && daysLeft <= 1;

  let label: string;
  let color: string;
  let bg: string;

  if (overdue) {
    const d = Math.abs(daysLeft);
    label = `${d}d overdue`;
    color = 'var(--ds-danger)';
    bg    = 'var(--ds-danger-light)';
  } else if (hoursLeft <= 24) {
    label = `${hoursLeft}h left`;
    color = 'var(--ds-danger)';
    bg    = 'var(--ds-danger-light)';
  } else {
    label = `${daysLeft}d SLA`;
    color = urgent ? '#F97316' : 'var(--ds-text-muted)';
    bg    = urgent ? 'rgba(249,115,22,0.15)' : 'var(--ds-surface-hover)';
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${overdue || urgent ? 'animate-pulse' : ''}`}
      style={{ background: bg, color }}>
      <Clock className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
}

// ─── Overdue Chip ─────────────────────────────────────────────────────────────
export function OverdueChip() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
      style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)', border: '1px solid var(--ds-danger)' }}>
      <Clock className="w-2.5 h-2.5 shrink-0" />
      OVERDUE
    </span>
  );
}

// ─── Follow-up Chip ───────────────────────────────────────────────────────────
// Shows when follow-up date is today or past.
export function FollowUpChip({ date }: { date: string }) {
  const daysLeft = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 0) return null;            // future — don't show
  const label = daysLeft === 0 ? 'Follow-up today' : `Follow-up ${Math.abs(daysLeft)}d ago`;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
      style={{ background: 'var(--ds-warn-light)', color: 'var(--ds-warn)', border: '1px solid var(--ds-warn)' }}>
      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
}

// ─── Learner Snapshot ─────────────────────────────────────────────────────────
export function LearnerSnapshot({ att, score, risk }: { att: number; score: number; risk: string }) {
  const items = [
    { label: 'Attendance', value: `${att}%`,   bad: att   < 75 },
    { label: 'Avg Score',  value: `${score}%`, bad: score < 50 },
    { label: 'Risk Level', value: risk,         bad: risk === 'high' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl p-3"
      style={{ background: DS.surfaceHover, border: `1px solid ${DS.borderLight}` }}>
      {items.map(({ label, value, bad }) => (
        <div key={label} className="text-center">
          <p className="text-sm font-black capitalize"
            style={{ color: bad ? 'var(--ds-danger)' : DS.text }}>{value}</p>
          <p className="text-[10px] uppercase tracking-wide mt-0.5"
            style={{ color: DS.textMuted }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────
interface TEntry { label: string; sub?: string; color?: string; note?: string }
export function ActivityTimeline({ entries }: { entries: TEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs py-2" style={{ color: DS.textMuted }}>No activity yet.</p>;
  }
  return (
    <div className="space-y-0">
      {entries.map((e, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center shrink-0 pt-1">
            <div className="w-2.5 h-2.5 rounded-full ring-2"
              style={{ background: e.color ?? DS.textMuted, outline: `2px solid ${DS.bg}` }} />
            {i < entries.length - 1 && (
              <div className="w-px flex-1 my-1 min-h-[16px]"
                style={{ background: DS.borderLight }} />
            )}
          </div>
          <div className="pb-3 flex-1 min-w-0">
            <p className="text-xs font-semibold leading-snug" style={{ color: DS.text }}>{e.label}</p>
            {e.note && <p className="text-xs mt-0.5" style={{ color: DS.textMid }}>{e.note}</p>}
            {e.sub  && <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{e.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export function KPICard({
  label, value, color, sub, icon: Icon,
}: {
  label: string; value: string | number; color: string; sub?: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl p-5 transition-all duration-200"
      style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums" style={{ color }}>{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1" style={{ color: DS.textMuted }}>{sub}</p>}
    </div>
  );
}
