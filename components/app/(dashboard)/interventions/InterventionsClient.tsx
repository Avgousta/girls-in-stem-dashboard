'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Loader2, ChevronDown, ChevronRight, Plus, X, Search,
  Clock, CheckCircle2, AlertTriangle, TrendingUp, Activity,
} from 'lucide-react';
import { fmt } from '@/utils';
import {
  PriorityBadge, StatusBadge, TypeTag, OverdueChip,
  LearnerSnapshot, ActivityTimeline, KPICard, TYPE_CFG, STATUS_CFG,
} from '@/components/interventions/InterventionBadges';

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Intervention card ────────────────────────────────────────────────────────
function IntervCard({ item, onUpdate }: { item:Interv; onUpdate:(id:string,d:any)=>void }) {
  const [open,   setOpen]   = useState(false);
  const [note,   setNote]   = useState('');
  const [status, setStatus] = useState(item.status);
  const [saving, setSaving] = useState(false);

  const overdue   = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'resolved';
  const isCrit    = item.priority === 'critical' && item.status !== 'resolved';
  const tcfg      = TYPE_CFG[item.type] ?? TYPE_CFG.other;

  const timelineEntries = [
    { label:`Logged by ${item.flagged_by}`, sub: fmt.date(item.created), color:'#94A3B8' },
    ...item.updates.map(u => ({
      label:  u.status_change ? `Status changed: ${u.status_change}` : u.note,
      note:   u.status_change ? u.note : undefined,
      sub:    `${u.author} · ${fmt.date(u.created)}`,
      color:  u.status_change ? '#1D4ED8' : '#10B981',
    })),
    ...(item.status === 'resolved' && item.resolved_at
      ? [{ label:'Resolved ✓', sub: fmt.date(item.resolved_at), color:'#10B981' }]
      : []),
  ];

  const save = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const changed = status !== item.status;
      await Promise.all([
        fetch(`/api/v1/interventions/${item.id}/updates`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ note: note.trim(), status_change: changed ? `${item.status} → ${status}` : null }),
        }),
        changed ? fetch(`/api/v1/interventions/${item.id}`, {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ status }),
        }) : Promise.resolve(),
      ]);
      onUpdate(item.id, { status, newNote: { note:note.trim(), status_change:changed?`${item.status}→${status}`:null, created:new Date().toISOString(), author:'You' } });
      setNote('');
      toast.success('Update saved');
    } catch { toast.error('Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden
      ${isCrit ? 'ring-2 ring-red-300' : 'border border-gray-100'}
      ${overdue ? 'border-l-4 border-l-red-400' : ''}`}>

      {/* Summary row */}
      <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50/50 select-none"
        onClick={() => setOpen(o => !o)}>

        <div className="flex items-center gap-2 mt-0.5 shrink-0">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="text-lg">{tcfg.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link href={`/learners/${item.learner_id}`} onClick={e => e.stopPropagation()}
              className="font-bold text-sm text-gray-900 hover:text-brand-700 hover:underline">
              {item.learner}
            </Link>
            <PriorityBadge priority={item.priority} />
            <StatusBadge status={item.status} />
            <TypeTag type={item.type} />
            {overdue && <OverdueChip />}
            {isCrit && <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full animate-pulse">CRITICAL</span>}
          </div>
          <p className="text-xs text-gray-500 line-clamp-1">{item.reason}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
            <span>🏫 {item.school}</span>
            {item.assigned_to && <span>👤 {item.assigned_to}</span>}
            <span>📅 {fmt.date(item.created)}</span>
            {item.due_date && (
              <span className={overdue ? 'text-red-500 font-semibold' : ''}>Due {fmt.date(item.due_date)}</span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex gap-3 shrink-0 text-right">
          {[{v:item.att, label:'Att', bad:item.att<75},{v:item.score,label:'Score',bad:item.score<50},{v:item.updates.length,label:'Updates',bad:false}].map(({v,label,bad}) => (
            <div key={label}>
              <p className={`text-sm font-black tabular-nums ${bad?'text-red-600':'text-gray-700'}`}>{v}{label!=='Updates'?'%':''}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded detail panel */}
      {open && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">

            {/* Left: reason + plan + snapshot */}
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Reason</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.reason}</p>
              </div>
              {item.action_plan && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Action Plan</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{item.action_plan}</p>
                </div>
              )}
              {item.action_taken && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Actions Taken</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{item.action_taken}</p>
                </div>
              )}
              <LearnerSnapshot att={item.att} score={item.score} risk={item.risk} />
              <div className="flex gap-2 pt-1">
                <Link href={`/learners/${item.learner_id}`}
                  className="flex-1 text-xs font-semibold text-center py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors">
                  View Learner Profile
                </Link>
                <Link href={`/mentorship/new?learner=${item.learner_id}`}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-xs font-semibold text-center py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors">
                  💬 Link Mentorship
                </Link>
              </div>
            </div>

            {/* Right: timeline + update form */}
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Activity Timeline</p>
                <ActivityTimeline entries={timelineEntries} />
              </div>

              {item.status !== 'resolved' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Add Update</p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 shrink-0">Status:</label>
                    <select value={status} onChange={e => setStatus(e.target.value)}
                      className="form-select text-xs flex-1">
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved ✓</option>
                    </select>
                  </div>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Describe the action taken or latest development…"
                    rows={3} className="form-input w-full text-sm resize-none" />
                  <button onClick={save} disabled={saving || !note.trim()}
                    className="btn-primary text-sm w-full justify-center disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Update'}
                  </button>
                </div>
              )}

              {item.status === 'resolved' && item.resolved_at && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-green-700">✓ Resolved</p>
                  <p className="text-xs text-green-600 mt-0.5">{fmt.date(item.resolved_at)}</p>
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
export default function InterventionsClient({ interventions: initial, atRisk, stats, learners, instructors, currentUserId }: Props) {
  const [items,  setItems]  = useState(initial);
  const [tab,    setTab]    = useState<'active'|'resolved'|'at_risk'>('active');
  const [search, setSearch] = useState('');
  const [typeF,  setTypeF]  = useState('');
  const [prioF,  setPrioF]  = useState('');

  const onUpdate = (id:string, data:any) => setItems(prev => prev.map(i =>
    i.id !== id ? i : { ...i, status: data.status, updates: data.newNote ? [...i.updates, data.newNote] : i.updates }
  ));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      if (tab === 'active')   return i.status !== 'resolved';
      if (tab === 'resolved') return i.status === 'resolved';
      return true;
    }).filter(i => {
      if (typeF && i.type     !== typeF) return false;
      if (prioF && i.priority !== prioF) return false;
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
          { label:'Open',           value:stats.open,        color:'#DC2626', sub:'Need attention',       icon:AlertTriangle  },
          { label:'In Progress',    value:stats.inProgress,  color:'#1D4ED8', sub:'Being addressed',      icon:Activity       },
          { label:'Critical',       value:stats.critical,    color:'#EF4444', sub:'Urgent action needed', icon:AlertTriangle  },
          { label:'Overdue',        value:stats.overdue,     color:stats.overdue>0?'#EF4444':'#10B981',   sub:'Past due date', icon:Clock },
          { label:'Resolved',       value:stats.resolved,    color:'#10B981', sub:`${stats.resRate}% success`, icon:CheckCircle2 },
          { label:'Avg Resolution', value:stats.avgDaysToResolve!=null?`${stats.avgDaysToResolve}d`:'—', color:'#7C3AED', sub:'Days to close', icon:TrendingUp },
        ].map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Tab bar + filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {([['active',`Active (${active})`],['resolved',`Resolved (${resolved})`],['at_risk',`Early Warning (${atRisk.length})`]] as const).map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab===k?'bg-white shadow text-gray-900':'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>

          {tab !== 'at_risk' && (
            <>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search learner, reason, school…" className="form-input pl-9 w-full text-sm" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
              <select value={typeF} onChange={e => setTypeF(e.target.value)} className="form-select text-sm w-36">
                <option value="">All types</option>
                {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <select value={prioF} onChange={e => setPrioF(e.target.value)} className="form-select text-sm w-36">
                <option value="">All priorities</option>
                {Object.keys({ critical:1,high:1,medium:1,low:1 }).map(k => (
                  <option key={k} value={k} className="capitalize">{k}</option>
                ))}
              </select>
              {(search||typeF||prioF) && (
                <button onClick={() => { setSearch(''); setTypeF(''); setPrioF(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </>
          )}

          <Link href="/interventions/new" className="btn-primary text-sm ml-auto whitespace-nowrap">
            <Plus className="w-4 h-4" /> Log Intervention
          </Link>
        </div>
        {tab !== 'at_risk' && (search||typeF||prioF) && (
          <p className="text-xs text-gray-400">{filtered.length} of {tab==='active'?active:resolved} shown</p>
        )}
      </div>

      {/* Active / Resolved list */}
      {tab !== 'at_risk' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-gray-400 font-medium">No interventions found</p>
              {(search||typeF||prioF) && (
                <button onClick={() => { setSearch(''); setTypeF(''); setPrioF(''); }}
                  className="text-sm text-brand-600 hover:underline mt-1">
                  Clear filters
                </button>
              )}
            </div>
          ) : filtered.map(i => <IntervCard key={i.id} item={i} onUpdate={onUpdate} />)}
        </div>
      )}

      {/* Early Warning tab */}
      {tab === 'at_risk' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Early Warning System</strong> — Learners automatically flagged from real-time risk scores.
              Act early to prevent escalation.
            </p>
          </div>
          {atRisk.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-gray-500 font-medium">No high/medium risk learners currently flagged</p>
            </div>
          ) : atRisk.map(l => (
            <div key={l.learner_id} className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-wrap items-center gap-4
              ${l.risk==='high'?'border-red-200 border-l-4 border-l-red-400':'border-amber-200 border-l-4 border-l-amber-400'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link href={`/learners/${l.learner_id}`}
                    className="font-bold text-sm text-gray-900 hover:text-brand-700 hover:underline">
                    {l.learner}
                  </Link>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full
                    ${l.risk==='high'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>
                    {l.risk==='high'?'High Risk':'Monitoring'}
                  </span>
                  {l.has_critical && (
                    <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full animate-pulse">
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{l.school}</p>
              </div>
              <div className="flex gap-4 text-center">
                {[{v:l.att,l:'Att',t:75},{v:l.score,l:'Score',t:50},{v:l.open_interventions,l:'Open',t:999}].map(({v,l: lbl,t}) => (
                  <div key={lbl}>
                    <p className={`text-lg font-black tabular-nums ${v<t&&lbl!=='Open'?'text-red-600':lbl==='Open'&&v>0?'text-amber-600':'text-gray-700'}`}>{v}{lbl!=='Open'?'%':''}</p>
                    <p className="text-[10px] text-gray-400">{lbl}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Link href={`/learners/${l.learner_id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                  View Profile
                </Link>
                <Link href={`/interventions/new?learner=${l.learner_id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-700 text-white hover:bg-brand-800">
                  Log Intervention
                </Link>
                <Link href={`/mentorship/new?learner=${l.learner_id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-mint-500 text-white hover:bg-mint-600">
                  Assign Mentor
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
