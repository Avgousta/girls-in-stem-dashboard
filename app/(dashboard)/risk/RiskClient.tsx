'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  AlertTriangle, TrendingDown, Calendar, Search, X,
  ChevronDown, ChevronUp, Loader2, Plus,
  ShieldAlert, ShieldCheck, Shield, BarChart2,
} from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import { fmt } from '@/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RiskRow {
  score_id: string; risk_level: 'high' | 'medium' | 'low';
  attendance_rate: number; avg_score: number;
  risk_flags: string[]; last_calculated: string;
  learner_id: string; learner_name: string;
  school_name: string; programme_name: string | null;
}
interface Props {
  risks: RiskRow[]; schools: string[]; currentUserId: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const RISK_CFG = {
  high:   { color: 'var(--ds-danger)',  bg: 'var(--ds-danger-light)',  label: 'High',   Icon: ShieldAlert  },
  medium: { color: 'var(--ds-warn)',    bg: 'var(--ds-warn-light)',    label: 'Medium', Icon: Shield       },
  low:    { color: 'var(--ds-success)', bg: 'var(--ds-success-light)', label: 'Low',    Icon: ShieldCheck  },
} as const;

const FLAG_LABELS: Record<string, string> = {
  attendance_critical: '< 75% attendance',
  score_critical:      '< 50% avg score',
  attendance_warning:  '75–84% attendance',
  score_warning:       '50–59% avg score',
};

// ─── Inline intervention button ───────────────────────────────────────────────
function LogInterventionButton({ risk, currentUserId }: { risk: RiskRow; currentUserId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const log = async () => {
    setState('loading');
    const type   = risk.risk_flags.some(f => f.includes('attendance')) ? 'attendance' : 'academic';
    const reason = risk.risk_flags
      .map(f => FLAG_LABELS[f] ?? f)
      .join('; ') || 'Elevated risk score';

    try {
      const res = await fetch('/api/v1/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id:        risk.learner_id,
          flagged_by:        currentUserId,
          intervention_type: type,
          priority:          risk.risk_level === 'high' ? 'high' : 'medium',
          reason:            `Auto-flagged from Risk Monitor: ${reason}.`,
          status:            'open',
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      setState('done');
      toast.success(`Intervention logged for ${risk.learner_name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e) ?? 'Failed to log intervention');
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <span className="text-xs font-semibold" style={{ color: 'var(--ds-success)' }}>
        ✓ Logged
      </span>
    );
  }

  return (
    <button onClick={log} disabled={state === 'loading'}
      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-60"
      style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)', border: '1px solid var(--ds-danger)' }}>
      {state === 'loading'
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <Plus className="w-3 h-3" />}
      Log Intervention
    </button>
  );
}

// ─── Risk card ────────────────────────────────────────────────────────────────
function RiskCard({ risk, currentUserId, selected, onToggle }: {
  risk: RiskRow; currentUserId: string;
  selected: boolean; onToggle: (id: string) => void;
}) {
  const cfg = RISK_CFG[risk.risk_level];

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 transition-all"
      style={{
        background:  DS.surface,
        border:      `1px solid ${DS.border}`,
        borderLeft:  `4px solid ${cfg.color}`,
      }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Checkbox */}
          {risk.risk_level !== 'low' && (
            <input type="checkbox" checked={selected} onChange={() => onToggle(risk.score_id)}
              className="w-3.5 h-3.5 rounded cursor-pointer shrink-0 accent-violet-600" />
          )}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: cfg.bg }}>
            <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <Link href={`/learners/${risk.learner_id}`}
              className="text-sm font-bold hover:underline truncate block" style={{ color: DS.text }}>
              {risk.learner_name}
            </Link>
            <p className="text-[11px] truncate" style={{ color: DS.textMuted }}>
              {risk.school_name}{risk.programme_name ? ` · ${risk.programme_name}` : ''}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase"
          style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Calendar,    label: 'Attendance', value: risk.attendance_rate, bad: risk.attendance_rate < 75, warn: risk.attendance_rate < 85 },
          { icon: TrendingDown,label: 'Avg Score',  value: risk.avg_score,       bad: risk.avg_score < 50,       warn: risk.avg_score < 60       },
        ].map(({ icon: Icon, label, value, bad, warn }) => (
          <div key={label} className="rounded-xl p-3" style={{ background: DS.surfaceHover }}>
            <div className="flex items-center gap-1 mb-1">
              <Icon className="w-3 h-3" style={{ color: DS.textMuted }} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: DS.textMuted }}>
                {label}
              </span>
            </div>
            <p className="text-xl font-black tabular-nums"
              style={{ color: bad ? 'var(--ds-danger)' : warn ? 'var(--ds-warn)' : 'var(--ds-success)' }}>
              {value}%
            </p>
          </div>
        ))}
      </div>

      {/* Flags */}
      {risk.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {risk.risk_flags.map(flag => (
            <span key={flag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}>
              {FLAG_LABELS[flag] ?? flag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2"
        style={{ borderTop: `1px solid ${DS.border}` }}>
        <p className="text-[10px]" style={{ color: DS.textMuted }}>
          Updated {fmt.date(risk.last_calculated)}
        </p>
        <div className="flex items-center gap-2">
          {risk.risk_level !== 'low' && (
            <LogInterventionButton risk={risk} currentUserId={currentUserId} />
          )}
          <Link href={`/learners/${risk.learner_id}`}
            className="text-xs font-semibold hover:underline" style={{ color: DS.textMuted }}>
            Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function RiskSection({
  level, risks, currentUserId, defaultOpen = true, selected, onToggle,
}: {
  level: 'high' | 'medium' | 'low'; risks: RiskRow[];
  currentUserId: string; defaultOpen?: boolean;
  selected: Set<string>; onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = RISK_CFG[level];
  const pulse = level === 'high' && risks.length > 0;

  const sectionLabel = {
    high:   'Immediate Action Required',
    medium: 'Monitor Closely',
    low:    'On Track',
  }[level];

  return (
    <section>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between mb-3 cursor-pointer group">
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: cfg.color, ...(pulse ? { animation: 'pulse 2s infinite' } : {}) }} />
          <span style={{ color: cfg.color }}>{cfg.label} Risk</span>
          <span style={{ color: DS.textMuted }}>— {sectionLabel}</span>
          <span className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>
            {risks.length}
          </span>
        </h2>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: DS.textMuted }} />
          : <ChevronDown className="w-4 h-4" style={{ color: DS.textMuted }} />}
      </button>

      {open && (
        risks.length === 0 ? (
          <div className="text-center py-8 rounded-2xl text-sm"
            style={{ background: DS.surface, border: `1px solid ${DS.border}`, color: DS.textMuted }}>
            No {level}-risk learners
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {risks.map(r => (
              <RiskCard key={r.score_id} risk={r} currentUserId={currentUserId}
                selected={selected.has(r.score_id)} onToggle={onToggle} />
            ))}
          </div>
        )
      )}
    </section>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: DS.bg, border: `1px solid ${DS.border}` }}>
      <p className="font-bold mb-1" style={{ color: DS.textMid }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill ?? p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Analytics panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ risks }: { risks: RiskRow[] }) {
  // School breakdown — count high + medium per school
  const schoolData = useMemo(() => {
    const map: Record<string, { school: string; high: number; medium: number }> = {};
    risks.forEach(r => {
      if (r.risk_level === 'low') return;
      if (!map[r.school_name]) map[r.school_name] = { school: r.school_name, high: 0, medium: 0 };
      map[r.school_name][r.risk_level]++;
    });
    return Object.values(map).sort((a, b) => (b.high + b.medium) - (a.high + a.medium));
  }, [risks]);

  // Flag frequency
  const flagData = useMemo(() => {
    const counts: Record<string, number> = {};
    risks.forEach(r => r.risk_flags.forEach(f => { counts[f] = (counts[f] ?? 0) + 1; }));
    return Object.entries(counts)
      .map(([flag, count]) => ({ flag: FLAG_LABELS[flag] ?? flag, count }))
      .sort((a, b) => b.count - a.count);
  }, [risks]);

  // Distribution proportions
  const total  = risks.length;
  const high   = risks.filter(r => r.risk_level === 'high').length;
  const medium = risks.filter(r => r.risk_level === 'medium').length;
  const low    = risks.filter(r => r.risk_level === 'low').length;

  const maxFlag   = Math.max(...flagData.map(f => f.count), 1);
  const maxSchool = Math.max(...schoolData.map(s => s.high + s.medium), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* ── School breakdown ── */}
      <div className="lg:col-span-2 rounded-2xl p-5"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>
          School Breakdown
        </p>
        <p className="text-sm font-semibold mb-4" style={{ color: DS.text }}>
          High &amp; medium risk learners per school
        </p>
        {schoolData.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: DS.textMuted }}>No at-risk data</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(schoolData.length * 40, 120)}>
            <BarChart data={schoolData} layout="vertical" barSize={10} barGap={3}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} horizontal={false} />
              <XAxis type="number" allowDecimals={false}
                tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="school" width={140}
                tick={{ fontSize: 11, fill: DS.text as string }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
              <Bar dataKey="high"   name="High"   fill="var(--ds-danger)" radius={[0,3,3,0]} stackId="a" />
              <Bar dataKey="medium" name="Medium" fill="var(--ds-warn)"   radius={[0,3,3,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-4 mt-3 justify-end">
          {[{ color:'var(--ds-danger)', label:'High' }, { color:'var(--ds-warn)', label:'Medium' }].map(l => (
            <span key={l.label} className="flex items-center gap-1 text-xs" style={{ color: DS.textMuted }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right column: flags + distribution ── */}
      <div className="flex flex-col gap-4">

        {/* Distribution bar */}
        <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>
            Distribution
          </p>
          <p className="text-sm font-semibold mb-3" style={{ color: DS.text }}>Cohort risk breakdown</p>
          {/* Stacked bar */}
          <div className="h-4 rounded-full overflow-hidden flex mb-3" style={{ background: DS.borderLight }}>
            {total > 0 && ([
              { count: high,   color: 'var(--ds-danger)' },
              { count: medium, color: 'var(--ds-warn)'   },
              { count: low,    color: 'var(--ds-success)' },
            ]).filter(s => s.count > 0).map((s, i) => (
              <div key={i} className="h-full transition-all duration-500"
                style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
            ))}
          </div>
          <div className="space-y-2">
            {([
              { label:'High',   count: high,   color:'var(--ds-danger)'  },
              { label:'Medium', count: medium, color:'var(--ds-warn)'    },
              { label:'Low',    count: low,    color:'var(--ds-success)' },
            ]).map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span style={{ color: DS.textMid }}>{label}</span>
                </span>
                <span className="font-bold tabular-nums" style={{ color }}>
                  {count} <span style={{ color: DS.textMuted }}>({total ? Math.round(count/total*100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Flag frequency */}
        <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>
            Risk Flags
          </p>
          <p className="text-sm font-semibold mb-3" style={{ color: DS.text }}>Most common triggers</p>
          {flagData.length === 0 ? (
            <p className="text-xs" style={{ color: DS.textMuted }}>No flags recorded</p>
          ) : (
            <div className="space-y-3">
              {flagData.map(({ flag, count }) => (
                <div key={flag}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate" style={{ color: DS.textMid }}>{flag}</span>
                    <span className="text-xs font-black tabular-nums ml-2" style={{ color: DS.text }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxFlag) * 100}%`, background: 'var(--ds-danger)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RiskClient({ risks, schools, currentUserId }: Props) {
  const [search,       setSearch]       = useState('');
  const [schoolF,      setSchoolF]      = useState('');
  const [levelF,       setLevelF]       = useState('');
  const [showAnalytics,setShowAnalytics]= useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [bulkLoading,  setBulkLoading]  = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return risks.filter(r => {
      if (schoolF && r.school_name !== schoolF)   return false;
      if (levelF  && r.risk_level  !== levelF)    return false;
      if (q && !`${r.learner_name} ${r.school_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [risks, search, schoolF, levelF]);

  const high   = filtered.filter(r => r.risk_level === 'high');
  const medium = filtered.filter(r => r.risk_level === 'medium');
  const low    = filtered.filter(r => r.risk_level === 'low');

  const hasFilters = search || schoolF || levelF;
  const clear      = () => { setSearch(''); setSchoolF(''); setLevelF(''); };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selectableFiltered = filtered.filter(r => r.risk_level !== 'low');
  const allSelected        = selectableFiltered.length > 0 && selectableFiltered.every(r => selectedIds.has(r.score_id));
  const toggleAll          = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableFiltered.map(r => r.score_id)));
  };

  const bulkLog = async () => {
    if (!window.confirm(`Log interventions for ${selectedIds.size} learner${selectedIds.size !== 1 ? 's' : ''}?`)) return;
    setBulkLoading(true);
    const targets = risks.filter(r => selectedIds.has(r.score_id));
    let succeeded = 0;
    await Promise.allSettled(targets.map(async r => {
      const type   = r.risk_flags.some(f => f.includes('attendance')) ? 'attendance' : 'academic';
      const reason = r.risk_flags.map(f => FLAG_LABELS[f] ?? f).join('; ') || 'Elevated risk score';
      const res = await fetch('/api/v1/interventions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id: r.learner_id, flagged_by: currentUserId,
          intervention_type: type,
          priority: r.risk_level === 'high' ? 'high' : 'medium',
          reason: `Bulk flagged from Risk Monitor: ${reason}.`,
          status: 'open',
        }),
      });
      if (res.ok) succeeded++;
    }));
    setBulkLoading(false);
    setSelectedIds(new Set());
    toast.success(`${succeeded} intervention${succeeded !== 1 ? 's' : ''} logged`);
    if (succeeded < targets.length) toast.error(`${targets.length - succeeded} failed`);
  };

  const selectStyle: React.CSSProperties = {
    background: DS.surfaceHover as string, color: DS.text as string,
    border: `1px solid ${DS.border}`, borderRadius: '10px',
    padding: '7px 12px', fontSize: '13px', outline: 'none',
  };

  // Summary counts (always from full risks, not filtered)
  const allHigh   = risks.filter(r => r.risk_level === 'high').length;
  const allMedium = risks.filter(r => r.risk_level === 'medium').length;
  const allLow    = risks.filter(r => r.risk_level === 'low').length;

  return (
    <div className="space-y-6 pb-20">

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { level: 'high'   as const, count: allHigh,   sub: 'Immediate action' },
          { level: 'medium' as const, count: allMedium, sub: 'Monitor closely'  },
          { level: 'low'    as const, count: allLow,    sub: 'On track'         },
        ]).map(({ level, count, sub }) => {
          const cfg = RISK_CFG[level];
          return (
            <div key={level} className="rounded-2xl p-5 cursor-pointer transition-all"
              style={{ background: DS.surface, border: `1px solid ${levelF === level ? cfg.color : DS.border}` }}
              onClick={() => setLevelF(l => l === level ? '' : level)}>
              <div className="flex items-center gap-2 mb-3">
                <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-4xl font-black tabular-nums" style={{ color: cfg.color }}>{count}</p>
              <p className="text-xs mt-1" style={{ color: DS.textMuted }}>{sub}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics toggle */}
      <div className="flex gap-3">
        <button onClick={() => setShowAnalytics(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          style={showAnalytics
            ? { background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }
            : { background: DS.surface,      color: DS.textMid as string, border: `1px solid ${DS.border}` }}>
          <BarChart2 className="w-4 h-4" />
          {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          {showAnalytics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showAnalytics && <AnalyticsPanel risks={risks} />}

      {/* Filter bar */}
      <div className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search learner name…"
              className="form-input pl-9 w-full text-sm" />
          </div>

          <select value={schoolF} onChange={e => setSchoolF(e.target.value)} style={selectStyle}>
            <option value="">All schools</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={levelF} onChange={e => setLevelF(e.target.value)} style={selectStyle}>
            <option value="">All levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          {hasFilters && (
            <button onClick={clear}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer"
              style={{ background: DS.surfaceHover, color: DS.textMuted as string }}>
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {selectableFiltered.length > 0 && (
            <button onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer ml-auto"
              style={{ background: DS.surfaceHover, color: DS.textMid as string, border: `1px solid ${DS.border}` }}>
              <input type="checkbox" readOnly checked={allSelected}
                className="w-3 h-3 rounded accent-violet-600 pointer-events-none" />
              {allSelected ? 'Deselect All' : `Select All (${selectableFiltered.length})`}
            </button>
          )}
        </div>
        {hasFilters && (
          <p className="text-xs mt-2" style={{ color: DS.textMuted }}>
            Showing {filtered.length} of {risks.length} learners
          </p>
        )}
      </div>

      {/* Risk sections */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-medium" style={{ color: DS.textMid }}>No learners match your filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          <RiskSection level="high"   risks={high}   currentUserId={currentUserId} defaultOpen={true}  selected={selectedIds} onToggle={toggleSelect} />
          <RiskSection level="medium" risks={medium} currentUserId={currentUserId} defaultOpen={true}  selected={selectedIds} onToggle={toggleSelect} />
          <RiskSection level="low"    risks={low}    currentUserId={currentUserId} defaultOpen={false} selected={selectedIds} onToggle={toggleSelect} />
        </div>
      )}

      {/* Sticky bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl"
          style={{ background: DS.surface, border: `1px solid ${DS.primaryBorder}` }}>
          <p className="text-sm font-semibold" style={{ color: DS.text }}>
            {selectedIds.size} learner{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <button onClick={bulkLog} disabled={bulkLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)', border: '1px solid var(--ds-danger)' }}>
            {bulkLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />}
            Log {selectedIds.size} Intervention{selectedIds.size !== 1 ? 's' : ''}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="p-1.5 rounded-lg cursor-pointer" style={{ color: DS.textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
