'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Loader2, ChevronDown, ChevronRight, Plus, X, Search,
  Clock, CheckCircle2, AlertTriangle, TrendingUp, Activity,
  School, User, Calendar, ExternalLink, HeartHandshake,
  AlertCircle, BarChart2, Users, CheckSquare, Square,
  RotateCcw, Layers, ChevronUp, ArrowUpCircle, Download, Printer,
} from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
import {
  PriorityBadge, StatusBadge, TypeTag, OverdueChip, SLAChip,
  FollowUpChip, LearnerSnapshot, ActivityTimeline, KPICard,
  TYPE_CFG,
} from '@/components/interventions/InterventionBadges';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Update { id:string; note:string; status_change:string|null; created:string; author:string }
interface Interv {
  id:string; type:string; priority:string; reason:string; action_plan:string; action_taken:string;
  follow_up:string|null; due_date:string|null; status:string; created:string; resolved_at:string|null;
  learner_id:string; learner:string; school:string; risk:string; att:number; score:number;
  flagged_by:string; assigned_to:string|null; assigned_id:string|null; updates:Update[];
}
interface AtRisk { learner_id:string; learner:string; school:string; risk:string; att:number; score:number; open_interventions:number; has_critical:boolean }
interface Stats   { open:number; inProgress:number; resolved:number; critical:number; overdue:number; resRate:number; avgDaysToResolve:number|null; typeDist:Record<string,number> }
interface LearnerOption   { learner_id: string; full_name: string; school: string }
interface InstructorOption { user_id: string; full_name: string }
interface Props   { interventions:Interv[]; atRisk:AtRisk[]; stats:Stats; learners:LearnerOption[]; instructors:InstructorOption[]; currentUserId:string }

// ─── Trend chart tooltip ──────────────────────────────────────────────────────
interface TooltipPayload { name: string; value: number; color?: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: DS.bg, border: `1px solid ${DS.border}` }}>
      <p className="font-bold mb-1" style={{ color: DS.textMid }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Trend Chart ─────────────────────────────────────────────────────────────
function TrendChart({ items }: { items: Interv[] }) {
  const data = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekOffset = 7 - i;
      const end   = new Date(); end.setDate(end.getDate() - weekOffset * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      const logged   = items.filter(x => { const d = new Date(x.created);     return d >= start && d <= end; }).length;
      const resolved = items.filter(x => { if (!x.resolved_at) return false; const d = new Date(x.resolved_at); return d >= start && d <= end; }).length;
      return { label, Logged: logged, Resolved: resolved };
    });
  }, [items]);

  return (
    <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>
            8-Week Trend
          </p>
          <p className="text-sm font-semibold" style={{ color: DS.text }}>Interventions logged vs resolved</p>
        </div>
        <BarChart2 className="w-5 h-5" style={{ color: DS.textMuted }} />
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={8} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} width={24} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
          <Bar dataKey="Logged"   fill="#7C3AED" radius={[3,3,0,0]} />
          <Bar dataKey="Resolved" fill="#34D399" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-end">
        {[{ color:'#7C3AED', label:'Logged' }, { color:'#34D399', label:'Resolved' }].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-xs" style={{ color: DS.textMuted }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Workload Panel ───────────────────────────────────────────────────────────
function WorkloadPanel({ items, instructors, onFilter }: { items:Interv[]; instructors:InstructorOption[]; onFilter:(id:string)=>void }) {
  const workload = useMemo(() => {
    const map: Record<string, { name: string; open: number; critical: number }> = {};
    items.filter(i => i.status !== 'resolved' && i.assigned_id).forEach(i => {
      if (!map[i.assigned_id!]) {
        const instr = instructors.find(x => x.user_id === i.assigned_id);
        map[i.assigned_id!] = { name: instr?.full_name ?? 'Unknown', open: 0, critical: 0 };
      }
      map[i.assigned_id!].open++;
      if (i.priority === 'critical') map[i.assigned_id!].critical++;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.open - a.open);
  }, [items, instructors]);

  const maxOpen = Math.max(...workload.map(w => w.open), 1);

  if (workload.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: DS.textMuted }}>
        No open assignments
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {workload.map(w => (
        <button key={w.id} onClick={() => onFilter(w.id)}
          className="w-full text-left cursor-pointer rounded-xl px-3 py-2.5 transition-all"
          style={{ background: DS.surfaceHover }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = DS.primaryBorder; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold truncate" style={{ color: DS.text }}>{w.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {w.critical > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
                  {w.critical} crit
                </span>
              )}
              <span className="text-xs font-bold" style={{ color: DS.textMid }}>{w.open}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(w.open / maxOpen) * 100}%`,
                background: w.critical > 0 ? 'var(--ds-danger)' : DS.primary,
              }} />
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Outcome Tracker ──────────────────────────────────────────────────────────
function OutcomePanel({ item }: { item: Interv }) {
  const daysToResolve = item.resolved_at
    ? Math.round((new Date(item.resolved_at).getTime() - new Date(item.created).getTime()) / 86_400_000)
    : null;

  const resolutionNote = item.updates
    .slice()
    .reverse()
    .find(u => u.note.startsWith('RESOLUTION:'));

  const [reopening, setReopening] = useState(false);

  const reopen = async () => {
    setReopening(true);
    try {
      await fetch(`/api/v1/interventions/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });
      toast.success('Intervention re-opened');
      window.location.reload();
    } catch { toast.error('Could not re-open'); setReopening(false); }
  };

  return (
    <div className="space-y-4">
      {/* Outcome summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Days to Resolve', value: daysToResolve != null ? `${daysToResolve}d` : '—', color: daysToResolve != null && daysToResolve <= 3 ? 'var(--ds-success)' : DS.text },
          { label: 'Updates Logged',  value: item.updates.length, color: DS.text },
          { label: 'Baseline Att.',   value: `${item.att}%`, color: item.att < 75 ? 'var(--ds-danger)' : 'var(--ds-success)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center rounded-xl py-3"
            style={{ background: DS.surfaceHover }}>
            <p className="text-lg font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: DS.textMuted }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Resolution note */}
      {resolutionNote && (
        <div className="rounded-xl p-4 space-y-1"
          style={{ background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }}>
          <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--ds-success)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolution Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: DS.text }}>
            {resolutionNote.note.replace('RESOLUTION:', '').trim()}
          </p>
          <p className="text-[10px]" style={{ color: DS.textMuted }}>
            {resolutionNote.author} · {fmt.date(resolutionNote.created)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/learners/${item.learner_id}`}
          className="flex-1 btn-secondary text-xs justify-center">
          <ExternalLink className="w-3 h-3" />
          Check Current Profile
        </Link>
        <button onClick={reopen} disabled={reopening}
          className="btn-secondary text-xs px-3 flex items-center gap-1.5">
          {reopening ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Re-open
        </button>
      </div>
    </div>
  );
}

// ─── Escalate Panel ──────────────────────────────────────────────────────────
const PRIORITY_ORDER = ['low', 'medium', 'high', 'critical'] as const;

function EscalatePanel({
  item, onClose, onEscalated,
}: {
  item: Interv;
  onClose: () => void;
  onEscalated: (newPriority: string, update: { id: string; note: string; status_change: string | null; created: string; author: string }) => void;
}) {
  const [reason,    setReason]    = useState('');
  const [escalating, setEscalating] = useState(false);

  const currentIdx = PRIORITY_ORDER.indexOf(item.priority as typeof PRIORITY_ORDER[number]);
  const nextPriority = currentIdx < PRIORITY_ORDER.length - 1
    ? PRIORITY_ORDER[currentIdx + 1]
    : null;

  const PRIORITY_COLORS: Record<string, string> = {
    low: 'var(--ds-success)', medium: 'var(--ds-warn)',
    high: '#F97316', critical: 'var(--ds-danger)',
  };

  const submit = async () => {
    if (!reason.trim()) { toast.error('Please provide an escalation reason.'); return; }
    setEscalating(true);
    try {
      const res  = await fetch(`/api/v1/interventions/${item.id}/escalate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Escalation failed');
      onEscalated(json.data.priority, json.data.update);
      toast.success(`Escalated to ${json.data.priority.toUpperCase()} priority`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e) ?? 'Could not escalate');
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="rounded-xl p-4 space-y-3"
        style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.4)' }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2" style={{ color: '#F97316' }}>
            <ArrowUpCircle className="w-4 h-4" />
            Escalate Priority
          </p>
          <button onClick={onClose} className="cursor-pointer" style={{ color: DS.textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {nextPriority ? (
          <>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold px-2.5 py-0.5 rounded-full text-xs"
                style={{ background: `${PRIORITY_COLORS[item.priority]}20`, color: PRIORITY_COLORS[item.priority] }}>
                {item.priority.toUpperCase()}
              </span>
              <span style={{ color: DS.textMuted }}>→</span>
              <span className="font-black px-2.5 py-0.5 rounded-full text-xs animate-pulse"
                style={{ background: `${PRIORITY_COLORS[nextPriority]}25`, color: PRIORITY_COLORS[nextPriority] }}>
                {nextPriority.toUpperCase()}
              </span>
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: DS.textMid }}>
                Escalation reason <span style={{ color: 'var(--ds-danger)' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why does this intervention need to be escalated? What has changed?"
                rows={3}
                className="form-input w-full text-sm resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={submit} disabled={escalating || !reason.trim()}
                className="btn-primary text-xs px-4 py-2">
                {escalating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                Confirm Escalation
              </button>
              <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cancel</button>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: DS.textMid }}>
            This intervention is already at <strong>CRITICAL</strong> priority — the highest level.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(items: Interv[]) {
  const headers = [
    'Learner', 'School', 'Type', 'Priority', 'Status', 'Risk',
    'Attendance%', 'Score%', 'Reason', 'Action Plan', 'Assigned To',
    'Flagged By', 'Created', 'Due Date', 'Follow-up', 'Resolved At', 'Updates',
  ];

  const rows = items.map(i => [
    i.learner, i.school, i.type, i.priority, i.status, i.risk,
    i.att, i.score,
    `"${(i.reason || '').replace(/"/g, '""')}"`,
    `"${(i.action_plan || '').replace(/"/g, '""')}"`,
    i.assigned_to ?? '',
    i.flagged_by,
    i.created.slice(0, 10),
    i.due_date ?? '',
    i.follow_up ?? '',
    i.resolved_at?.slice(0, 10) ?? '',
    i.updates.length,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `interventions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${items.length} interventions to CSV`);
}

// ─── Intervention Card ────────────────────────────────────────────────────────
function IntervCard({
  item, onUpdate, selected, onSelect,
}: {
  item: Interv;
  onUpdate: (id:string, d:{ status: string; newNote?: Update }) => void;
  selected: boolean;
  onSelect: (id:string, checked:boolean) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [note,       setNote]       = useState('');
  const [resolution, setResolution] = useState('');
  const [status,     setStatus]     = useState(item.status);
  const [saving,     setSaving]     = useState(false);
  const [activeTab,  setActiveTab]  = useState<'detail'|'outcome'>('detail');
  const [escalating, setEscalating] = useState(false);
  const [priority,   setPriority]   = useState(item.priority);

  const overdue    = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'resolved';
  const isCrit     = item.priority === 'critical' && item.status !== 'resolved';
  const tcfg       = TYPE_CFG[item.type] ?? TYPE_CFG.other;
  const { Icon: TypeIcon } = tcfg;
  const isResolving = status === 'resolved' && item.status !== 'resolved';

  const timelineEntries = [
    { label:`Logged by ${item.flagged_by}`, sub: fmt.date(item.created), color:'var(--ds-text-muted)' },
    ...item.updates.map(u => ({
      label: u.status_change ? `Status → ${u.status_change}` : u.note,
      note:  u.status_change ? u.note : undefined,
      sub:   `${u.author} · ${fmt.date(u.created)}`,
      color: u.status_change ? DS.primary : 'var(--ds-success)',
    })),
    ...(item.status === 'resolved' && item.resolved_at
      ? [{ label:'Resolved', sub: fmt.date(item.resolved_at), color:'var(--ds-success)' }]
      : []),
  ];

  const save = async () => {
    if (!note.trim() && !isResolving) return;
    if (isResolving && !resolution.trim()) {
      toast.error('Please provide a resolution summary.');
      return;
    }
    setSaving(true);
    try {
      const changed   = status !== item.status;
      const finalNote = isResolving
        ? `RESOLUTION: ${resolution.trim()}${note.trim() ? `\n\n${note.trim()}` : ''}`
        : note.trim();

      await Promise.all([
        fetch(`/api/v1/interventions/${item.id}/updates`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ note: finalNote, status_change: changed ? `${item.status} → ${status}` : null }),
        }),
        changed ? fetch(`/api/v1/interventions/${item.id}`, {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ status }),
        }) : Promise.resolve(),
      ]);

      onUpdate(item.id, {
        status,
        newNote: { id: crypto.randomUUID(), note: finalNote, status_change: changed ? `${item.status} → ${status}` : null, created: new Date().toISOString(), author: 'You' },
      });
      setNote('');
      setResolution('');
      toast.success(isResolving ? 'Intervention resolved ✓' : 'Update saved');
    } catch { toast.error('Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: DS.surface,
        border: isCrit ? `2px solid var(--ds-danger)` : `1px solid ${selected ? DS.primaryBorder : DS.border}`,
        borderLeft: overdue && !isCrit ? `4px solid var(--ds-danger)` : undefined,
      }}>
      {isCrit && <div className="h-1 w-full animate-pulse" style={{ background:'linear-gradient(90deg, var(--ds-danger), #F97316)' }} />}

      {/* Summary row */}
      <div className="flex items-start gap-3 p-4 select-none">
        {/* Checkbox */}
        <button
          onClick={() => onSelect(item.id, !selected)}
          className="mt-0.5 shrink-0 cursor-pointer"
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          {selected
            ? <CheckSquare className="w-4 h-4" style={{ color: DS.primary }} />
            : <Square className="w-4 h-4" style={{ color: DS.textMuted }} />
          }
        </button>

        {/* Expand + type icon */}
        <div className="flex items-center gap-2 mt-0.5 shrink-0 cursor-pointer" onClick={() => setOpen(o => !o)}>
          {open ? <ChevronDown className="w-4 h-4" style={{ color: DS.textMuted }} />
                : <ChevronRight className="w-4 h-4" style={{ color: DS.textMuted }} />}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:`${tcfg.color}18` }}>
            <TypeIcon className="w-3.5 h-3.5" style={{ color: tcfg.color }} />
          </div>
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(o => !o)}>
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Link href={`/learners/${item.learner_id}`} onClick={e => e.stopPropagation()}
              className="font-bold text-sm hover:underline" style={{ color: DS.text }}>
              {item.learner}
            </Link>
            <PriorityBadge priority={item.priority} />
            <StatusBadge status={item.status} />
            <TypeTag type={item.type} />
            {overdue && <OverdueChip />}
            {item.status !== 'resolved' && <SLAChip priority={item.priority} createdAt={item.created} />}
            {item.follow_up && item.status !== 'resolved' && <FollowUpChip date={item.follow_up} />}
          </div>
          <p className="text-xs line-clamp-1 mb-1.5" style={{ color: DS.textMid }}>{item.reason}</p>
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: DS.textMuted }}>
            <span className="flex items-center gap-1"><School className="w-3 h-3" />{item.school}</span>
            {item.assigned_to && <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assigned_to}</span>}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmt.date(item.created)}</span>
            {item.due_date && (
              <span className="flex items-center gap-1" style={{ color: overdue ? 'var(--ds-danger)' : DS.textMuted }}>
                <Clock className="w-3 h-3" />Due {fmt.date(item.due_date)}
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-start gap-4 shrink-0">
          {/* Mini stats */}
          <div className="flex gap-4 text-right cursor-pointer" onClick={() => setOpen(o => !o)}>
            {[
              { v: item.att,           label:'Att',     bad: item.att < 75 },
              { v: item.score,         label:'Score',   bad: item.score < 50 },
              { v: item.updates.length,label:'Updates', bad: false },
            ].map(({ v, label, bad }) => (
              <div key={label}>
                <p className="text-sm font-black tabular-nums" style={{ color: bad ? 'var(--ds-danger)' : DS.text }}>
                  {v}{label !== 'Updates' ? '%' : ''}
                </p>
                <p className="text-[10px]" style={{ color: DS.textMuted }}>{label}</p>
              </div>
            ))}
          </div>
          {/* Escalate button — only for open non-critical interventions */}
          {item.status !== 'resolved' && priority !== 'critical' && (
            <button
              onClick={() => setEscalating(e => !e)}
              title="Escalate priority"
              className="mt-0.5 p-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: escalating ? '#F97316' : DS.textMuted, background: escalating ? 'rgba(249,115,22,0.12)' : 'transparent' }}
              onMouseOver={e => { if (!escalating) (e.currentTarget as HTMLButtonElement).style.color = '#F97316'; }}
              onMouseOut={e => { if (!escalating) (e.currentTarget as HTMLButtonElement).style.color = DS.textMuted as string; }}
            >
              <ArrowUpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Escalate panel */}
      {escalating && item.status !== 'resolved' && (
        <EscalatePanel
          item={{ ...item, priority }}
          onClose={() => setEscalating(false)}
          onEscalated={(newPriority, update) => {
            setPriority(newPriority);
            onUpdate(item.id, { status: item.status, newNote: { ...update, author: 'You' } });
          }}
        />
      )}

      {/* Expanded */}
      {open && (
        <div style={{ borderTop:`1px solid ${DS.borderLight}` }}>
          {/* Tab bar (only for resolved) */}
          {item.status === 'resolved' && (
            <div className="flex gap-1 px-5 pt-3">
              {(['detail', 'outcome'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer"
                  style={activeTab === t
                    ? { background: DS.primary, color: '#fff' }
                    : { background: DS.surfaceHover, color: DS.textMid }
                  }>
                  {t === 'outcome' ? 'Outcome Tracker' : 'Detail'}
                </button>
              ))}
            </div>
          )}

          {/* Outcome Tracker */}
          {item.status === 'resolved' && activeTab === 'outcome' && (
            <div className="p-5"><OutcomePanel item={item} /></div>
          )}

          {/* Detail panel */}
          {(item.status !== 'resolved' || activeTab === 'detail') && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x"
              style={{ '--tw-divide-color': DS.borderLight } as React.CSSProperties}>
              {/* Left */}
              <div className="p-5 space-y-4">
                {[
                  { key:'reason',       title:'Reason',         text: item.reason },
                  { key:'action_plan',  title:'Action Plan',    text: item.action_plan },
                  { key:'action_taken', title:'Actions Taken',  text: item.action_taken },
                ].filter(x => x.text).map(({ key, title, text }) => (
                  <div key={key}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>{title}</p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: DS.text }}>{text}</p>
                  </div>
                ))}
                <LearnerSnapshot att={item.att} score={item.score} risk={item.risk} />
                <div className="flex gap-2 pt-1">
                  <Link href={`/learners/${item.learner_id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl cursor-pointer"
                    style={{ background: DS.primaryLight, color: DS.primary, border:`1px solid ${DS.primaryBorder}` }}>
                    <ExternalLink className="w-3 h-3" />Learner Profile
                  </Link>
                  <Link href={`/mentorship/new?learner=${item.learner_id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl cursor-pointer"
                    style={{ background: DS.purpleLight, color: DS.purple, border:`1px solid ${DS.primaryBorder}` }}>
                    <HeartHandshake className="w-3 h-3" />Link Mentorship
                  </Link>
                </div>
              </div>
              {/* Right */}
              <div className="p-5 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>Activity Timeline</p>
                <ActivityTimeline entries={timelineEntries} />

                {item.status !== 'resolved' && (
                  <div className="space-y-3 pt-4" style={{ borderTop:`1px solid ${DS.borderLight}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>Add Update</p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs shrink-0" style={{ color: DS.textMid }}>Status:</label>
                      <select value={status} onChange={e => setStatus(e.target.value)} className="form-select text-xs flex-1">
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                    {isResolving && (
                      <div className="rounded-xl p-3 space-y-2"
                        style={{ background:'var(--ds-success-light)', border:'1px solid var(--ds-success)' }}>
                        <p className="text-xs font-bold flex items-center gap-1.5" style={{ color:'var(--ds-success)' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolution Summary <span style={{ color:'var(--ds-danger)' }}>*</span>
                        </p>
                        <p className="text-[11px]" style={{ color: DS.textMid }}>Required — describe what resolved this and the outcome.</p>
                        <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                          placeholder="What was done? What was the outcome for the learner?"
                          rows={3} className="form-input w-full text-sm resize-none" />
                      </div>
                    )}
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      placeholder={isResolving ? 'Optional additional notes…' : 'Describe the action taken or latest development…'}
                      rows={3} className="form-input w-full text-sm resize-none" />
                    <button onClick={save}
                      disabled={saving || (!note.trim() && !isResolving) || (isResolving && !resolution.trim())}
                      className="btn-primary text-sm w-full justify-center">
                      {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : isResolving ? <><CheckCircle2 className="w-4 h-4" /> Mark Resolved</>
                        : 'Save Update'}
                    </button>
                  </div>
                )}

                {item.status === 'resolved' && item.resolved_at && (
                  <div className="rounded-xl px-4 py-3 text-center"
                    style={{ background:'var(--ds-success-light)', border:'1px solid var(--ds-success)' }}>
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1" style={{ color:'var(--ds-success)' }} />
                    <p className="text-sm font-bold" style={{ color:'var(--ds-success)' }}>Resolved</p>
                    <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{fmt.date(item.resolved_at)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkBar({
  count, instructors, onResolve, onAssign, onClear, resolving,
}: {
  count:number; instructors:any[]; onResolve:()=>void; onAssign:(id:string)=>void;
  onClear:()=>void; resolving:boolean;
}) {
  const [showAssign, setShowAssign] = useState(false);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{ background: DS.sidebar, border:`1px solid ${DS.primaryBorder}`, boxShadow:`0 0 32px rgba(124,58,237,0.35)` }}>
      <span className="text-sm font-bold" style={{ color:'#C4B5FD' }}>
        <Layers className="w-4 h-4 inline mr-1.5" />{count} selected
      </span>
      <div className="h-4 w-px" style={{ background: DS.border }} />

      <button onClick={onResolve} disabled={resolving} className="btn-primary text-xs px-3 py-1.5">
        {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
        Resolve All
      </button>

      <div className="relative">
        <button onClick={() => setShowAssign(s => !s)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
          <Users className="w-3 h-3" />Assign To
          <ChevronDown className="w-3 h-3" />
        </button>
        {showAssign && (
          <div className="absolute bottom-full mb-2 left-0 rounded-xl overflow-hidden shadow-xl w-48 z-10"
            style={{ background: DS.sidebar, border:`1px solid ${DS.border}` }}>
            {instructors.map(i => (
              <button key={i.user_id}
                onClick={() => { onAssign(i.user_id); setShowAssign(false); }}
                className="w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                style={{ color: DS.text }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = DS.surfaceHover; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                {i.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={onClear} className="p-1.5 rounded-lg cursor-pointer"
        style={{ color: DS.textMuted }}
        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = DS.text; }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.color = DS.textMuted as string; }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InterventionsClient({
  interventions: initial, atRisk, stats, learners, instructors, currentUserId,
}: Props) {
  const [items,       setItems]       = useState(initial);
  const [tab,         setTab]         = useState<'active'|'resolved'|'at_risk'>('active');
  const [search,      setSearch]      = useState('');
  const [typeF,       setTypeF]       = useState('');
  const [prioF,       setPrioF]       = useState('');
  const [assigneeF,   setAssigneeF]   = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resolving,   setResolving]   = useState(false);
  const [showWorkload,setShowWorkload]= useState(false);
  const [showTrend,   setShowTrend]   = useState(false);
  const [autoFlagging,setAutoFlagging]= useState(false);

  const onUpdate = (id: string, data: { status: string; newNote?: Update }) =>
    setItems(prev => prev.map(i =>
      i.id !== id ? i : { ...i, status: data.status, updates: data.newNote ? [...i.updates, data.newNote] : i.updates }
    ));

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => { const s = new Set(prev); checked ? s.add(id) : s.delete(id); return s; });
  };

  const bulkResolve = async () => {
    if (!window.confirm(`Mark ${selectedIds.size} intervention(s) as resolved?`)) return;
    setResolving(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/v1/interventions/${id}`, {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ status:'resolved' }),
        })
      ));
      setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status:'resolved' } : i));
      toast.success(`${selectedIds.size} interventions resolved`);
      setSelectedIds(new Set());
    } catch { toast.error('Some updates failed'); }
    finally { setResolving(false); }
  };

  const bulkAssign = async (userId: string) => {
    const name = instructors.find(i => i.user_id === userId)?.full_name ?? 'instructor';
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/v1/interventions/${id}`, {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ assigned_to: userId }),
        })
      ));
      setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, assigned_to: name, assigned_id: userId } : i));
      toast.success(`${selectedIds.size} interventions assigned to ${name}`);
      setSelectedIds(new Set());
    } catch { toast.error('Some assignments failed'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter(i => tab === 'active' ? i.status !== 'resolved' : tab === 'resolved' ? i.status === 'resolved' : true)
      .filter(i => {
        if (typeF     && i.type !== typeF)           return false;
        if (prioF     && i.priority !== prioF)       return false;
        if (assigneeF && i.assigned_id !== assigneeF) return false;
        if (q && !`${i.learner} ${i.reason} ${i.school}`.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [items, tab, search, typeF, prioF, assigneeF]);

  const active   = items.filter(i => i.status !== 'resolved').length;
  const resolved = items.filter(i => i.status === 'resolved').length;

  const clearFilters = () => { setSearch(''); setTypeF(''); setPrioF(''); setAssigneeF(''); };
  const hasFilters   = search || typeF || prioF || assigneeF;

  const unflaggedCount = atRisk.filter(r => r.open_interventions === 0).length;

  const autoFlag = async () => {
    if (unflaggedCount === 0) return;
    if (!window.confirm(`Auto-create interventions for ${unflaggedCount} at-risk learner${unflaggedCount === 1 ? '' : 's'} with no open intervention?`)) return;
    setAutoFlagging(true);
    try {
      const res  = await fetch('/api/v1/interventions/auto-flag', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Auto-flag failed'); return; }
      toast.success(json.data.message);
      window.location.reload();
    } catch { toast.error('Auto-flag failed'); }
    finally { setAutoFlagging(false); }
  };

  return (
    <div className="space-y-5 pb-20">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label:'Open',           value: stats.open,        color:'var(--ds-danger)',   sub:'Need attention',       icon: AlertTriangle },
          { label:'In Progress',    value: stats.inProgress,  color: DS.primary,          sub:'Being addressed',      icon: Activity      },
          { label:'Critical',       value: stats.critical,    color:'var(--ds-danger)',   sub:'Urgent action needed', icon: AlertCircle   },
          { label:'Overdue',        value: stats.overdue,     color: stats.overdue > 0 ? 'var(--ds-danger)' : 'var(--ds-success)', sub:'Past due date', icon: Clock },
          { label:'Resolved',       value: stats.resolved,    color:'var(--ds-success)',  sub:`${stats.resRate}% rate`, icon: CheckCircle2 },
          { label:'Avg Resolution', value: stats.avgDaysToResolve != null ? `${stats.avgDaysToResolve}d` : '—', color: DS.purple, sub:'Days to close', icon: TrendingUp },
        ].map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Trend chart + workload toggle row */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => setShowTrend(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          style={showTrend
            ? { background: DS.primaryLight, color: DS.primary, border:`1px solid ${DS.primaryBorder}` }
            : { background: DS.surface, color: DS.textMid, border:`1px solid ${DS.border}` }}>
          <BarChart2 className="w-4 h-4" />
          {showTrend ? 'Hide Trend' : 'Show Trend'}
          {showTrend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button onClick={() => setShowWorkload(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          style={showWorkload
            ? { background: DS.primaryLight, color: DS.primary, border:`1px solid ${DS.primaryBorder}` }
            : { background: DS.surface, color: DS.textMid, border:`1px solid ${DS.border}` }}>
          <Users className="w-4 h-4" />
          Workload
          {showWorkload ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {unflaggedCount > 0 && (
          <button onClick={autoFlag} disabled={autoFlagging}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--ds-warn-light)', color: 'var(--ds-warn)', border: '1px solid var(--ds-warn)' }}>
            {autoFlagging
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <AlertTriangle className="w-4 h-4" />}
            Auto-flag {unflaggedCount} at-risk
          </button>
        )}
      </div>

      {/* Trend chart */}
      {showTrend && <TrendChart items={items} />}

      {/* Workload panel */}
      {showWorkload && (
        <div className="rounded-2xl p-5" style={{ background: DS.surface, border:`1px solid ${DS.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>Instructor Workload</p>
              <p className="text-sm font-semibold" style={{ color: DS.text }}>Open interventions per assignee</p>
            </div>
            <p className="text-xs" style={{ color: DS.textMuted }}>Click to filter</p>
          </div>
          <WorkloadPanel items={items} instructors={instructors} onFilter={id => { setAssigneeF(id); setShowWorkload(false); }} />
        </div>
      )}

      {/* Filter bar */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: DS.surface, border:`1px solid ${DS.border}` }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: DS.surfaceHover }}>
            {([['active',`Active (${active})`],['resolved',`Resolved (${resolved})`],['at_risk',`Early Warning (${atRisk.length})`]] as const).map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                style={tab === k ? { background: DS.primary, color:'#fff' } : { background:'transparent', color: DS.textMid }}>
                {l}
              </button>
            ))}
          </div>

          {tab !== 'at_risk' && (
            <>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search learner, reason, school…" className="form-input pl-9 w-full text-sm" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="w-3.5 h-3.5" style={{ color: DS.textMuted }} /></button>}
              </div>
              <select value={typeF} onChange={e => setTypeF(e.target.value)} className="form-select text-sm w-36">
                <option value="">All types</option>
                {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={prioF} onChange={e => setPrioF(e.target.value)} className="form-select text-sm w-36">
                <option value="">All priorities</option>
                {['critical','high','medium','low'].map(k => <option key={k} value={k} className="capitalize">{k}</option>)}
              </select>
              {assigneeF && (
                <button onClick={() => setAssigneeF('')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl cursor-pointer"
                  style={{ background: DS.primaryLight, color: DS.primary, border:`1px solid ${DS.primaryBorder}` }}>
                  <User className="w-3 h-3" />
                  {instructors.find((i:any) => i.user_id === assigneeF)?.full_name ?? 'Filtered'}
                  <X className="w-3 h-3" />
                </button>
              )}
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: DS.textMuted }}>
                  <X className="w-3 h-3" />Clear
                </button>
              )}
            </>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* Export CSV */}
            {tab !== 'at_risk' && filtered.length > 0 && (
              <button
                onClick={() => exportCSV(filtered)}
                className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap"
                title="Export current view to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
            <Link href="/interventions/new" className="btn-primary text-sm whitespace-nowrap">
              <Plus className="w-4 h-4" />Log Intervention
            </Link>
          </div>
        </div>
        {tab !== 'at_risk' && hasFilters && (
          <p className="text-xs" style={{ color: DS.textMuted }}>
            {filtered.length} of {tab === 'active' ? active : resolved} shown
          </p>
        )}
      </div>

      {/* Active / Resolved list */}
      {tab !== 'at_risk' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: DS.surface, border:`1px solid ${DS.border}` }}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: DS.textMuted }} />
              <p className="font-medium" style={{ color: DS.textMuted }}>No interventions found</p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-sm mt-1 cursor-pointer hover:underline" style={{ color: DS.primary }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : filtered.map(i => (
            <IntervCard key={i.id} item={i} onUpdate={onUpdate}
              selected={selectedIds.has(i.id)}
              onSelect={toggleSelect} />
          ))}
        </div>
      )}

      {/* Early Warning */}
      {tab === 'at_risk' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background:'var(--ds-warn-light)', border:'1px solid var(--ds-warn)' }}>
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color:'var(--ds-warn)' }} />
            <div>
              <p className="text-sm font-bold" style={{ color:'var(--ds-warn)' }}>Early Warning System</p>
              <p className="text-xs mt-0.5" style={{ color: DS.textMid }}>
                Learners auto-flagged from live risk scores. Act early to prevent escalation.
              </p>
            </div>
          </div>
          {atRisk.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: DS.surface, border:`1px solid ${DS.border}` }}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color:'var(--ds-success)' }} />
              <p className="font-medium" style={{ color: DS.textMid }}>No high/medium risk learners currently flagged</p>
            </div>
          ) : atRisk.map(l => (
            <div key={l.learner_id} className="flex flex-wrap items-center gap-4 rounded-2xl p-4"
              style={{
                background: DS.surface,
                border:`1px solid ${l.risk === 'high' ? 'var(--ds-danger)' : 'var(--ds-warn)'}`,
                borderLeft:`4px solid ${l.risk === 'high' ? 'var(--ds-danger)' : 'var(--ds-warn)'}`,
              }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link href={`/learners/${l.learner_id}`} className="font-bold text-sm hover:underline cursor-pointer" style={{ color: DS.text }}>{l.learner}</Link>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: l.risk==='high' ? 'var(--ds-danger-light)' : 'var(--ds-warn-light)', color: l.risk==='high' ? 'var(--ds-danger)' : 'var(--ds-warn)' }}>
                    {l.risk==='high' ? 'High Risk' : 'Monitoring'}
                  </span>
                  {l.has_critical && <span className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse" style={{ background:'var(--ds-danger)', color:'#fff' }}>Critical</span>}
                </div>
                <p className="text-xs flex items-center gap-1" style={{ color: DS.textMuted }}><School className="w-3 h-3" />{l.school}</p>
              </div>
              <div className="flex gap-4 text-center">
                {[{ v:l.att,label:'Att',bad:l.att<75 },{ v:l.score,label:'Score',bad:l.score<50 },{ v:l.open_interventions,label:'Open',bad:false }].map(({ v,label,bad }) => (
                  <div key={label}>
                    <p className="text-lg font-black tabular-nums" style={{ color: bad ? 'var(--ds-danger)' : DS.text }}>{v}{label!=='Open'?'%':''}</p>
                    <p className="text-[10px]" style={{ color: DS.textMuted }}>{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Link href={`/learners/${l.learner_id}`} className="btn-secondary text-xs px-3 py-1.5">View Profile</Link>
                <Link href={`/interventions/new?learner=${l.learner_id}`} className="btn-primary text-xs px-3 py-1.5">
                  <AlertTriangle className="w-3 h-3" />Log Intervention
                </Link>
                <Link href={`/mentorship/new?learner=${l.learner_id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
                  style={{ background:'var(--ds-success-light)', color:'var(--ds-success)', border:'1px solid var(--ds-success)' }}>
                  <HeartHandshake className="w-3 h-3" />Assign Mentor
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkBar
          count={selectedIds.size}
          instructors={instructors}
          onResolve={bulkResolve}
          onAssign={bulkAssign}
          onClear={() => setSelectedIds(new Set())}
          resolving={resolving}
        />
      )}
    </div>
  );
}
