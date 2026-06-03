'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Loader2, ChevronDown, ChevronRight, Plus, X, Search,
  Clock, CheckCircle2, AlertTriangle, TrendingUp, Activity,
  School, User, Calendar, ExternalLink, HeartHandshake,
  AlertCircle,
} from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
import {
  PriorityBadge, StatusBadge, TypeTag, OverdueChip, SLAChip,
  FollowUpChip, LearnerSnapshot, ActivityTimeline, KPICard,
  TYPE_CFG, STATUS_CFG, SLA_DAYS,
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
interface Props   { interventions:Interv[]; atRisk:AtRisk[]; stats:Stats; learners:any[]; instructors:any[]; currentUserId:string }

// ─── Intervention Card ────────────────────────────────────────────────────────
function IntervCard({ item, onUpdate }: { item:Interv; onUpdate:(id:string,d:any)=>void }) {
  const [open,        setOpen]        = useState(false);
  const [note,        setNote]        = useState('');
  const [resolution,  setResolution]  = useState('');  // required when resolving
  const [status,      setStatus]      = useState(item.status);
  const [saving,      setSaving]      = useState(false);

  const overdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'resolved';
  const isCrit  = item.priority === 'critical' && item.status !== 'resolved';
  const tcfg    = TYPE_CFG[item.type] ?? TYPE_CFG.other;
  const { Icon: TypeIcon } = tcfg;

  // SLA: uses created date + priority SLA window
  const isResolving = status === 'resolved' && item.status !== 'resolved';

  const timelineEntries = [
    { label:`Logged by ${item.flagged_by}`, sub: fmt.date(item.created), color:'var(--ds-text-muted)' },
    ...item.updates.map(u => ({
      label:  u.status_change ? `Status → ${u.status_change}` : u.note,
      note:   u.status_change ? u.note : undefined,
      sub:    `${u.author} · ${fmt.date(u.created)}`,
      color:  u.status_change ? DS.primary : 'var(--ds-success)',
    })),
    ...(item.status === 'resolved' && item.resolved_at
      ? [{ label:'Resolved', sub: fmt.date(item.resolved_at), color:'var(--ds-success)' }]
      : []),
  ];

  const save = async () => {
    if (!note.trim() && !isResolving) return;
    if (isResolving && !resolution.trim()) {
      toast.error('Please provide a resolution summary before closing this intervention.');
      return;
    }
    setSaving(true);
    try {
      const changed    = status !== item.status;
      const finalNote  = isResolving
        ? `RESOLUTION: ${resolution.trim()}${note.trim() ? `\n\n${note.trim()}` : ''}`
        : note.trim();

      await Promise.all([
        fetch(`/api/v1/interventions/${item.id}/updates`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            note: finalNote,
            status_change: changed ? `${item.status} → ${status}` : null,
          }),
        }),
        changed ? fetch(`/api/v1/interventions/${item.id}`, {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ status }),
        }) : Promise.resolve(),
      ]);

      onUpdate(item.id, {
        status,
        newNote: {
          note: finalNote,
          status_change: changed ? `${item.status} → ${status}` : null,
          created: new Date().toISOString(),
          author: 'You',
        },
      });
      setNote('');
      setResolution('');
      toast.success(isResolving ? 'Intervention resolved ✓' : 'Update saved');
    } catch {
      toast.error('Could not save — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: DS.surface,
        border: isCrit
          ? `2px solid var(--ds-danger)`
          : overdue
            ? `1px solid var(--ds-danger)`
            : `1px solid ${DS.border}`,
        borderLeft: overdue && !isCrit ? `4px solid var(--ds-danger)` : undefined,
      }}
    >
      {/* Critical pulsing top bar */}
      {isCrit && (
        <div className="h-1 w-full animate-pulse"
          style={{ background: 'linear-gradient(90deg, var(--ds-danger), #F97316)' }} />
      )}

      {/* Summary row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none transition-colors"
        style={{ background: 'transparent' }}
        onClick={() => setOpen(o => !o)}
        onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.background = DS.surfaceHover; }}
        onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        {/* Expand icon + type icon */}
        <div className="flex items-center gap-2 mt-0.5 shrink-0">
          {open
            ? <ChevronDown className="w-4 h-4" style={{ color: DS.textMuted }} />
            : <ChevronRight className="w-4 h-4" style={{ color: DS.textMuted }} />
          }
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${tcfg.color}18` }}>
            <TypeIcon className="w-3.5 h-3.5" style={{ color: tcfg.color }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Link
              href={`/learners/${item.learner_id}`}
              onClick={e => e.stopPropagation()}
              className="font-bold text-sm hover:underline cursor-pointer"
              style={{ color: DS.text }}
            >
              {item.learner}
            </Link>
            <PriorityBadge priority={item.priority} />
            <StatusBadge status={item.status} />
            <TypeTag type={item.type} />
            {overdue && <OverdueChip />}
            {item.status !== 'resolved' && (
              <SLAChip priority={item.priority} createdAt={item.created} />
            )}
            {item.follow_up && item.status !== 'resolved' && (
              <FollowUpChip date={item.follow_up} />
            )}
          </div>

          {/* Reason preview */}
          <p className="text-xs line-clamp-1 mb-1.5" style={{ color: DS.textMid }}>
            {item.reason}
          </p>

          {/* Meta row — Lucide icons instead of emoji */}
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: DS.textMuted }}>
            <span className="flex items-center gap-1">
              <School className="w-3 h-3 shrink-0" />
              {item.school}
            </span>
            {item.assigned_to && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 shrink-0" />
                {item.assigned_to}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 shrink-0" />
              {fmt.date(item.created)}
            </span>
            {item.due_date && (
              <span className="flex items-center gap-1" style={{ color: overdue ? 'var(--ds-danger)' : DS.textMuted }}>
                <Clock className="w-3 h-3 shrink-0" />
                Due {fmt.date(item.due_date)}
              </span>
            )}
          </div>
        </div>

        {/* Right: mini stats */}
        <div className="hidden sm:flex gap-4 shrink-0 text-right">
          {[
            { v: item.att,           label: 'Att',     bad: item.att < 75 },
            { v: item.score,         label: 'Score',   bad: item.score < 50 },
            { v: item.updates.length,label: 'Updates', bad: false },
          ].map(({ v, label, bad }) => (
            <div key={label}>
              <p className="text-sm font-black tabular-nums"
                style={{ color: bad ? 'var(--ds-danger)' : DS.text }}>
                {v}{label !== 'Updates' ? '%' : ''}
              </p>
              <p className="text-[10px]" style={{ color: DS.textMuted }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: `1px solid ${DS.borderLight}` }}>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x"
            style={{ '--tw-divide-opacity': '1', borderColor: DS.borderLight } as any}>

            {/* Left: content */}
            <div className="p-5 space-y-4">
              {[
                { key: 'reason',      title: 'Reason',            text: item.reason },
                { key: 'action_plan', title: 'Action Plan',       text: item.action_plan },
                { key: 'action_taken',title: 'Actions Taken',     text: item.action_taken },
              ].filter(x => x.text).map(({ key, title, text }) => (
                <div key={key}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: DS.textMuted }}>{title}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: DS.text }}>{text}</p>
                </div>
              ))}

              <LearnerSnapshot att={item.att} score={item.score} risk={item.risk} />

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/learners/${item.learner_id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer"
                  style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Learner Profile
                </Link>
                <Link
                  href={`/mentorship/new?learner=${item.learner_id}`}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer"
                  style={{ background: DS.purpleLight, color: DS.purple, border: `1px solid ${DS.primaryBorder}` }}
                >
                  <HeartHandshake className="w-3 h-3" />
                  Link Mentorship
                </Link>
              </div>
            </div>

            {/* Right: timeline + update form */}
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3"
                  style={{ color: DS.textMuted }}>Activity Timeline</p>
                <ActivityTimeline entries={timelineEntries} />
              </div>

              {item.status !== 'resolved' && (
                <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: DS.textMuted }}>Add Update</p>

                  {/* Status selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs shrink-0" style={{ color: DS.textMid }}>Status:</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="form-select text-xs flex-1"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Resolution summary — required when closing */}
                  {isResolving && (
                    <div className="rounded-xl p-3 space-y-2"
                      style={{ background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }}>
                      <p className="text-xs font-bold flex items-center gap-1.5"
                        style={{ color: 'var(--ds-success)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolution Summary <span style={{ color: 'var(--ds-danger)' }}>*</span>
                      </p>
                      <p className="text-[11px]" style={{ color: DS.textMid }}>
                        Required — describe what resolved this intervention and any outcomes.
                      </p>
                      <textarea
                        value={resolution}
                        onChange={e => setResolution(e.target.value)}
                        placeholder="What was done to resolve this? What was the outcome?"
                        rows={3}
                        className="form-input w-full text-sm resize-none"
                      />
                    </div>
                  )}

                  {/* Progress note */}
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder={isResolving
                      ? 'Optional additional notes…'
                      : 'Describe the action taken or latest development…'}
                    rows={3}
                    className="form-input w-full text-sm resize-none"
                  />

                  <button
                    onClick={save}
                    disabled={saving || (!note.trim() && !isResolving) || (isResolving && !resolution.trim())}
                    className="btn-primary text-sm w-full justify-center"
                  >
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : isResolving
                        ? <><CheckCircle2 className="w-4 h-4" /> Mark Resolved</>
                        : 'Save Update'
                    }
                  </button>
                </div>
              )}

              {item.status === 'resolved' && item.resolved_at && (
                <div className="rounded-xl px-4 py-3 text-center"
                  style={{ background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }}>
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--ds-success)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--ds-success)' }}>Resolved</p>
                  <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{fmt.date(item.resolved_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InterventionsClient({
  interventions: initial, atRisk, stats, learners, instructors, currentUserId,
}: Props) {
  const [items,  setItems]  = useState(initial);
  const [tab,    setTab]    = useState<'active'|'resolved'|'at_risk'>('active');
  const [search, setSearch] = useState('');
  const [typeF,  setTypeF]  = useState('');
  const [prioF,  setPrioF]  = useState('');

  const onUpdate = (id: string, data: any) =>
    setItems(prev => prev.map(i =>
      i.id !== id ? i : {
        ...i,
        status: data.status,
        updates: data.newNote ? [...i.updates, data.newNote] : i.updates,
      }
    ));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter(i => {
        if (tab === 'active')   return i.status !== 'resolved';
        if (tab === 'resolved') return i.status === 'resolved';
        return true;
      })
      .filter(i => {
        if (typeF && i.type !== typeF)         return false;
        if (prioF && i.priority !== prioF)     return false;
        if (q && !`${i.learner} ${i.reason} ${i.school}`.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [items, tab, search, typeF, prioF]);

  const active   = items.filter(i => i.status !== 'resolved').length;
  const resolved = items.filter(i => i.status === 'resolved').length;

  return (
    <div className="space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label:'Open',           value: stats.open,         color:'var(--ds-danger)',   sub:'Need attention',        icon: AlertTriangle  },
          { label:'In Progress',    value: stats.inProgress,   color: DS.primary,          sub:'Being addressed',       icon: Activity       },
          { label:'Critical',       value: stats.critical,     color:'var(--ds-danger)',   sub:'Urgent action needed',  icon: AlertCircle    },
          { label:'Overdue',        value: stats.overdue,      color: stats.overdue > 0 ? 'var(--ds-danger)' : 'var(--ds-success)', sub:'Past due date', icon: Clock },
          { label:'Resolved',       value: stats.resolved,     color:'var(--ds-success)',  sub:`${stats.resRate}% rate`, icon: CheckCircle2  },
          { label:'Avg Resolution', value: stats.avgDaysToResolve != null ? `${stats.avgDaysToResolve}d` : '—', color: DS.purple, sub:'Days to close', icon: TrendingUp },
        ].map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Tab bar + filters */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex flex-wrap gap-3 items-center">

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: DS.surfaceHover }}>
            {([
              ['active',   `Active (${active})`],
              ['resolved', `Resolved (${resolved})`],
              ['at_risk',  `Early Warning (${atRisk.length})`],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                style={tab === k
                  ? { background: DS.primary, color: '#fff' }
                  : { background: 'transparent', color: DS.textMid }
                }
              >
                {l}
              </button>
            ))}
          </div>

          {tab !== 'at_risk' && (
            <>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search learner, reason, school…"
                  className="form-input pl-9 w-full text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                    <X className="w-3.5 h-3.5" style={{ color: DS.textMuted }} />
                  </button>
                )}
              </div>

              <select value={typeF} onChange={e => setTypeF(e.target.value)}
                className="form-select text-sm w-36">
                <option value="">All types</option>
                {Object.entries(TYPE_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              <select value={prioF} onChange={e => setPrioF(e.target.value)}
                className="form-select text-sm w-36">
                <option value="">All priorities</option>
                {['critical', 'high', 'medium', 'low'].map(k => (
                  <option key={k} value={k} className="capitalize">{k}</option>
                ))}
              </select>

              {(search || typeF || prioF) && (
                <button
                  onClick={() => { setSearch(''); setTypeF(''); setPrioF(''); }}
                  className="flex items-center gap-1 text-xs cursor-pointer"
                  style={{ color: DS.textMuted }}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </>
          )}

          <Link href="/interventions/new" className="btn-primary text-sm ml-auto whitespace-nowrap">
            <Plus className="w-4 h-4" /> Log Intervention
          </Link>
        </div>

        {tab !== 'at_risk' && (search || typeF || prioF) && (
          <p className="text-xs" style={{ color: DS.textMuted }}>
            {filtered.length} of {tab === 'active' ? active : resolved} shown
          </p>
        )}
      </div>

      {/* Active / Resolved list */}
      {tab !== 'at_risk' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30"
                style={{ color: DS.textMuted }} />
              <p className="font-medium" style={{ color: DS.textMuted }}>No interventions found</p>
              {(search || typeF || prioF) && (
                <button
                  onClick={() => { setSearch(''); setTypeF(''); setPrioF(''); }}
                  className="text-sm mt-1 cursor-pointer hover:underline"
                  style={{ color: DS.primary }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filtered.map(i => <IntervCard key={i.id} item={i} onUpdate={onUpdate} />)
          )}
        </div>
      )}

      {/* Early Warning tab */}
      {tab === 'at_risk' && (
        <div className="space-y-3">
          {/* Banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--ds-warn)' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--ds-warn)' }}>
                Early Warning System
              </p>
              <p className="text-xs mt-0.5" style={{ color: DS.textMid }}>
                Learners auto-flagged from live risk scores. Act early to prevent escalation.
              </p>
            </div>
          </div>

          {atRisk.length === 0 ? (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ds-success)' }} />
              <p className="font-medium" style={{ color: DS.textMid }}>
                No high/medium risk learners currently flagged
              </p>
            </div>
          ) : atRisk.map(l => (
            <div
              key={l.learner_id}
              className="flex flex-wrap items-center gap-4 rounded-2xl p-4"
              style={{
                background: DS.surface,
                border: `1px solid ${l.risk === 'high' ? 'var(--ds-danger)' : 'var(--ds-warn)'}`,
                borderLeft: `4px solid ${l.risk === 'high' ? 'var(--ds-danger)' : 'var(--ds-warn)'}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link href={`/learners/${l.learner_id}`}
                    className="font-bold text-sm hover:underline cursor-pointer"
                    style={{ color: DS.text }}>
                    {l.learner}
                  </Link>
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: l.risk === 'high' ? 'var(--ds-danger-light)' : 'var(--ds-warn-light)',
                      color:      l.risk === 'high' ? 'var(--ds-danger)' : 'var(--ds-warn)',
                    }}>
                    {l.risk === 'high' ? 'High Risk' : 'Monitoring'}
                  </span>
                  {l.has_critical && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                      style={{ background: 'var(--ds-danger)', color: '#fff' }}>
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-xs flex items-center gap-1" style={{ color: DS.textMuted }}>
                  <School className="w-3 h-3 shrink-0" />
                  {l.school}
                </p>
              </div>

              {/* Mini stats */}
              <div className="flex gap-4 text-center">
                {[
                  { v: l.att,                label: 'Att',   bad: l.att < 75 },
                  { v: l.score,              label: 'Score', bad: l.score < 50 },
                  { v: l.open_interventions, label: 'Open',  bad: false },
                ].map(({ v, label, bad }) => (
                  <div key={label}>
                    <p className="text-lg font-black tabular-nums"
                      style={{ color: bad ? 'var(--ds-danger)' : DS.text }}>
                      {v}{label !== 'Open' ? '%' : ''}
                    </p>
                    <p className="text-[10px]" style={{ color: DS.textMuted }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Link href={`/learners/${l.learner_id}`}
                  className="btn-secondary text-xs px-3 py-1.5">
                  View Profile
                </Link>
                <Link href={`/interventions/new?learner=${l.learner_id}`}
                  className="btn-primary text-xs px-3 py-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Log Intervention
                </Link>
                <Link href={`/mentorship/new?learner=${l.learner_id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-all"
                  style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)', border: '1px solid var(--ds-success)' }}>
                  <span className="flex items-center gap-1">
                    <HeartHandshake className="w-3 h-3" />
                    Assign Mentor
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
