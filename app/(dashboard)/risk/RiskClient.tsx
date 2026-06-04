'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertTriangle, TrendingDown, Calendar, Search, X,
  ChevronDown, ChevronUp, RefreshCw, Loader2, Plus,
  ShieldAlert, ShieldCheck, Shield,
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
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to log intervention');
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
function RiskCard({ risk, currentUserId }: { risk: RiskRow; currentUserId: string }) {
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
  level, risks, currentUserId, defaultOpen = true,
}: {
  level: 'high' | 'medium' | 'low'; risks: RiskRow[];
  currentUserId: string; defaultOpen?: boolean;
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
            {risks.map(r => <RiskCard key={r.score_id} risk={r} currentUserId={currentUserId} />)}
          </div>
        )
      )}
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RiskClient({ risks, schools, currentUserId }: Props) {
  const [search,  setSearch]  = useState('');
  const [schoolF, setSchoolF] = useState('');
  const [levelF,  setLevelF]  = useState('');

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
          <RiskSection level="high"   risks={high}   currentUserId={currentUserId} defaultOpen={true}  />
          <RiskSection level="medium" risks={medium} currentUserId={currentUserId} defaultOpen={true}  />
          <RiskSection level="low"    risks={low}    currentUserId={currentUserId} defaultOpen={false} />
        </div>
      )}
    </div>
  );
}
