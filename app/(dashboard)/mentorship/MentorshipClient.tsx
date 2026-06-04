'use client';
import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  Loader2, CheckCircle2, Target, Users, Calendar, Star,
  AlertTriangle, Plus, Activity, Search, X, Clock,
  ChevronDown, ChevronUp, BarChart2,
} from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
import {
  SessionTypeBadge, OutcomeBadge, GoalStatusBadge,
  MOOD_EMOJI, MOOD_LABEL, SESSION_TYPE_CFG, OUTCOME_CFG,
} from '@/components/mentorship/MentorshipBadges';
import { KPICard } from '@/components/interventions/InterventionBadges';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id:string; date:string; duration:number|null; type:string; notes:string;
  next_steps:string; goals:string; mood:number|null; outcome:string|null;
  learner_id:string; learner:string; school:string; risk:string;
  att:number; score:number; mentor:string; mentor_id:string;
}
interface Goal {
  id:string; title:string; desc:string; due:string|null; status:string; progress:number;
  learner:string; learner_id:string; mentor:string; mentor_id:string; created:string;
}
interface AtRisk {
  learner_id:string; learner:string; school:string; att:number; score:number;
  interests:string[]; aspiration:string|null; prog_types:string[];
  sessions_count:number; last_session:string|null; open_interv:number; critical_interv:boolean;
}
interface MentorStat {
  id:string; name:string; sessions:number; learners:number;
  positiveRate:number; avgMood:number|null; topType:string|null;
}
interface Props {
  sessions:Session[]; goals:Goal[]; atRisk:AtRisk[]; mentorStats:MentorStat[];
  stats:any; learners:any[]; mentors:any[]; currentUserId:string;
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: DS.bg, border: `1px solid ${DS.border}` }}>
      <p className="font-bold mb-1" style={{ color: DS.textMid }}>{label}</p>
      {payload.map((p: any) => p.value != null && (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.name === 'Mood' ? `${p.value}/5` : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── 8-week trend + mood chart ────────────────────────────────────────────────
function TrendChart({ sessions }: { sessions: Session[] }) {
  const data = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const weekOffset = 7 - i;
    const end   = new Date(); end.setDate(end.getDate() - weekOffset * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const label = `${start.getMonth() + 1}/${start.getDate()}`;
    const week  = sessions.filter(s => { const d = new Date(s.date); return d >= start && d <= end; });
    const moodSessions = week.filter(s => s.mood != null);
    const avgMood = moodSessions.length
      ? Math.round(moodSessions.reduce((sum, s) => sum + s.mood!, 0) / moodSessions.length * 10) / 10
      : null;
    return {
      label,
      Sessions: week.length,
      Positive: week.filter(s => s.outcome === 'positive').length,
      Mood:     avgMood,
    };
  }), [sessions]);

  return (
    <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>8-Week Trend</p>
          <p className="text-sm font-semibold" style={{ color: DS.text }}>Sessions · Positive outcomes · Avg mood</p>
        </div>
        <BarChart2 className="w-5 h-5" style={{ color: DS.textMuted }} />
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={data} barSize={9} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} width={20} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} width={20} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
          <Bar yAxisId="left" dataKey="Sessions" fill="#7C3AED" radius={[3,3,0,0]} />
          <Bar yAxisId="left" dataKey="Positive" fill="#34D399" radius={[3,3,0,0]} />
          <Line yAxisId="right" type="monotone" dataKey="Mood" stroke="#FBBF24" strokeWidth={2} dot={{ fill:'#FBBF24', r:3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-end">
        {[
          { color:'#7C3AED', label:'Sessions' },
          { color:'#34D399', label:'Positive' },
          { color:'#FBBF24', label:'Avg Mood' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-xs" style={{ color: DS.textMuted }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Cadence chip ─────────────────────────────────────────────────────────────
function CadenceChip({ lastSession }: { lastSession: string | null }) {
  if (!lastSession) {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
        No sessions yet
      </span>
    );
  }
  const days  = Math.floor((Date.now() - new Date(lastSession).getTime()) / 86_400_000);
  const color = days > 14 ? 'var(--ds-danger)' : days > 7 ? 'var(--ds-warn)' : 'var(--ds-success)';
  const bg    = days > 14 ? 'var(--ds-danger-light)' : days > 7 ? 'var(--ds-warn-light)' : 'var(--ds-success-light)';
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ background: bg, color }}>
      <Clock className="w-3 h-3" />
      {days === 0 ? 'Today' : `${days}d ago`}
    </span>
  );
}

// ─── Progress slider ──────────────────────────────────────────────────────────
function ProgressSlider({ goalId, initial }: { goalId: string; initial: number }) {
  const [value,   setValue]   = useState(initial);
  const [saving,  setSaving]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (v: number) => {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/v1/mentorship/goals/${goalId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: v }),
        });
      } catch { toast.error('Could not save progress'); }
      finally { setSaving(false); }
    }, 600);
  };

  const color = value === 100 ? 'var(--ds-success)' : value >= 50 ? DS.primary : 'var(--ds-warn)';

  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>Progress</p>
        <span className="text-xs font-black tabular-nums flex items-center gap-1" style={{ color }}>
          {value}%
          {saving && <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: DS.textMuted }} />}
        </span>
      </div>
      {/* Track + fill */}
      <div className="relative h-1.5 rounded-full" style={{ background: DS.borderLight }}>
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, background: color }} />
      </div>
      <input type="range" min={0} max={100} step={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 opacity-0 absolute"
        style={{ marginTop: '-6px', cursor: 'pointer' }}
      />
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ s }: { s: Session }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
        onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.background = DS.surfaceHover as string; }}
        onMouseOut={e =>  { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: `${SESSION_TYPE_CFG[s.type]?.color ?? '#94A3B8'}20` }}>
          {SESSION_TYPE_CFG[s.type]?.icon ?? '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/learners/${s.learner_id}`} onClick={e => e.stopPropagation()}
              className="font-bold text-sm hover:underline" style={{ color: DS.text }}>
              {s.learner}
            </Link>
            <SessionTypeBadge type={s.type} />
            <OutcomeBadge outcome={s.outcome} />
            {s.mood != null && (
              <span title={`${MOOD_LABEL[s.mood]} (${s.mood}/5)`}>{MOOD_EMOJI[s.mood]}</span>
            )}
            {s.risk === 'high' && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
                HIGH RISK
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: DS.textMuted }}>
            <span>📅 {fmt.date(s.date)}</span>
            {s.duration && <span>⏱ {s.duration}m</span>}
            <span>🧑‍🏫 {s.mentor}</span>
            <span>🏫 {s.school}</span>
          </div>
        </div>
        <div className="hidden sm:flex gap-4 shrink-0 items-center">
          {[{ v: s.att, l: 'Att', bad: s.att < 75 }, { v: s.score, l: 'Score', bad: s.score < 50 }].map(({ v, l, bad }) => (
            <div key={l} className="text-right">
              <p className="text-sm font-black tabular-nums"
                style={{ color: bad ? 'var(--ds-danger)' : DS.textMid }}>{v}%</p>
              <p className="text-[10px]" style={{ color: DS.textMuted }}>{l}</p>
            </div>
          ))}
          <ChevronDown className="w-4 h-4 transition-transform" style={{
            color: DS.textMuted as string,
            transform: open ? 'rotate(180deg)' : undefined,
          }} />
        </div>
      </div>

      {open && (s.notes || s.next_steps || s.goals) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 pb-4 pt-3"
          style={{ borderTop: `1px solid ${DS.border}` }}>
          {[
            { label: 'Session Notes',   value: s.notes },
            { label: 'Goals Discussed', value: s.goals },
            { label: 'Next Steps',      value: s.next_steps },
          ].filter(f => f.value).map(f => (
            <div key={f.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: DS.textMuted }}>{f.label}</p>
              <p className="text-sm leading-relaxed" style={{ color: DS.textMid }}>{f.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onComplete }: { goal: Goal; onComplete: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  const overdue = goal.due && new Date(goal.due) < new Date() && goal.status === 'active';
  const done    = goal.status === 'completed';

  const complete = async () => {
    setLoading(true);
    try {
      await fetch(`/api/v1/mentorship/goals/${goal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', progress: 100 }),
      });
      onComplete(goal.id);
      toast.success('Goal completed! 🎉');
    } catch { toast.error('Failed to update goal'); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{
        background: done ? 'var(--ds-success-light)' : overdue ? 'var(--ds-danger-light)' : DS.surface,
        border: `1px solid ${done ? 'var(--ds-success)' : overdue ? 'var(--ds-danger)' : DS.border}`,
        opacity: done ? 0.75 : 1,
      }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: done ? 'var(--ds-success-light)' : DS.surfaceHover }}>
          {done ? '✅' : '🎯'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold" style={{ color: DS.text }}>{goal.title}</p>
            <GoalStatusBadge status={goal.status} />
            {overdue && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
                ⏰ Overdue
              </span>
            )}
          </div>
          {goal.desc && (
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: DS.textMid }}>{goal.desc}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs" style={{ color: DS.textMuted }}>
            <span>👩‍🎓 {goal.learner}</span>
            {goal.due && <span>Due {fmt.date(goal.due)}</span>}
            <span>🧑‍🏫 {goal.mentor}</span>
          </div>

          {/* Progress slider — only on active goals */}
          {goal.status === 'active' && (
            <div className="relative mt-3">
              <ProgressSlider goalId={goal.id} initial={goal.progress} />
            </div>
          )}
        </div>

        {goal.status === 'active' && (
          <button onClick={complete} disabled={loading}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
            style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)', border: '1px solid var(--ds-success)' }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Done'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inline goal creation form ────────────────────────────────────────────────
function AddGoalPanel({
  learners, mentors, currentUserId, onAdded, onClose,
}: {
  learners: any[]; mentors: any[]; currentUserId: string;
  onAdded: (goal: Goal) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    learner_id: '', title: '', description: '', target_date: '', mentor_id: currentUserId,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle: React.CSSProperties = {
    background: DS.surfaceHover as string, color: DS.text as string,
    border: `1px solid ${DS.border}`, borderRadius: '10px',
    padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%',
  };

  const save = async () => {
    if (!form.learner_id || !form.title.trim()) return;
    setSaving(true);
    try {
      const res  = await fetch('/api/v1/mentorship/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id:  form.learner_id,
          mentor_id:   form.mentor_id,
          title:       form.title.trim(),
          description: form.description || undefined,
          target_date: form.target_date || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Failed to create goal'); return; }

      const learner = learners.find(l => l.learner_id === form.learner_id);
      const mentor  = mentors.find(m => m.user_id === form.mentor_id);
      onAdded({
        id:         json.data.goal_id,
        title:      json.data.title,
        desc:       json.data.description ?? '',
        due:        json.data.target_date ?? null,
        status:     'active',
        progress:   0,
        learner:    learner?.full_name ?? '',
        learner_id: form.learner_id,
        mentor:     mentor?.full_name ?? '',
        mentor_id:  form.mentor_id,
        created:    json.data.created_at,
      });
      toast.success('Goal created');
      onClose();
    } catch { toast.error('Failed to create goal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: DS.surface, border: `1px solid ${DS.primaryBorder}` }}>
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm" style={{ color: DS.text }}>New Goal</p>
        <button onClick={onClose} className="cursor-pointer" style={{ color: DS.textMuted }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Learner */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>
            Learner *
          </label>
          <select value={form.learner_id} onChange={e => set('learner_id', e.target.value)} style={inputStyle}>
            <option value="">Select learner…</option>
            {learners.map((l: any) => (
              <option key={l.learner_id} value={l.learner_id}>{l.full_name} — {l.school}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>
            Goal Title *
          </label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Improve maths attendance to 90%" style={inputStyle} />
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>
            Description
          </label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Additional context or steps…" rows={2}
            style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {/* Target date */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>
            Target Date
          </label>
          <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)}
            style={inputStyle} />
        </div>

        {/* Mentor */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>
            Assigned Mentor
          </label>
          <select value={form.mentor_id} onChange={e => set('mentor_id', e.target.value)} style={inputStyle}>
            {mentors.map((m: any) => (
              <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button onClick={save}
          disabled={saving || !form.learner_id || !form.title.trim()}
          className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create Goal</>}
        </button>
      </div>
    </div>
  );
}

// ─── Mentor card ──────────────────────────────────────────────────────────────
function MentorCard({ m }: { m: MentorStat }) {
  const tcfg    = m.topType ? SESSION_TYPE_CFG[m.topType] : null;
  const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 text-white"
          style={{ background: DS.primary }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: DS.text }}>{m.name}</p>
          {tcfg && <p className="text-xs" style={{ color: DS.textMuted }}>{tcfg.icon} Focuses on {tcfg.label}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { value: m.sessions,          label: 'Sessions', color: DS.primary },
          { value: m.learners,          label: 'Learners', color: DS.primary },
          { value: `${m.positiveRate}%`,label: 'Positive', color: m.positiveRate >= 70 ? 'var(--ds-success)' : DS.textMid },
        ].map(({ value, label, color }) => (
          <div key={label} className="rounded-xl py-2.5" style={{ background: DS.surfaceHover }}>
            <p className="text-lg font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: DS.textMuted }}>{label}</p>
          </div>
        ))}
      </div>
      {m.avgMood != null && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
            <div className="h-full rounded-full" style={{ width: `${(m.avgMood / 5) * 100}%`, background: '#FBBF24' }} />
          </div>
          <span className="text-xs" style={{ color: DS.textMuted }}>
            Avg mood {MOOD_EMOJI[Math.round(m.avgMood)]}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MentorshipClient({
  sessions, goals: initialGoals, atRisk, mentorStats, stats, learners, mentors, currentUserId,
}: Props) {
  const [goals,       setGoals]       = useState(initialGoals);
  const [tab,         setTab]         = useState<'sessions'|'goals'|'at_risk'|'mentors'>('sessions');
  const [search,      setSearch]      = useState('');
  const [mentorF,     setMentorF]     = useState('');
  const [typeF,       setTypeF]       = useState('');
  const [outcomeF,    setOutcomeF]    = useState('');
  const [showTrend,   setShowTrend]   = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const now          = new Date().toISOString().slice(0, 10);
  const activeGoals  = goals.filter(g => g.status === 'active').length;
  const overdueGoals = goals.filter(g => g.status === 'active' && g.due && g.due < now).length;
  const doneGoals    = goals.filter(g => g.status === 'completed').length;

  const onComplete = (id: string) =>
    setGoals(prev => prev.map(g => g.id !== id ? g : { ...g, status: 'completed', progress: 100 }));
  const onAdded    = (goal: Goal) =>
    setGoals(prev => [goal, ...prev]);

  const hasFilters   = search || mentorF || typeF || outcomeF;
  const clearFilters = () => { setSearch(''); setMentorF(''); setTypeF(''); setOutcomeF(''); };

  const filteredSessions = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter(s => {
      if (mentorF  && s.mentor_id !== mentorF) return false;
      if (typeF    && s.type      !== typeF)    return false;
      if (outcomeF && s.outcome   !== outcomeF) return false;
      if (q && !`${s.learner} ${s.mentor} ${s.school} ${s.notes}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sessions, search, mentorF, typeF, outcomeF]);

  const sortedAtRisk = useMemo(() => [...atRisk].sort((a, b) => {
    if (!a.last_session && b.last_session)  return -1;
    if (a.last_session  && !b.last_session) return 1;
    if (a.critical_interv && !b.critical_interv) return -1;
    if (!a.critical_interv && b.critical_interv) return 1;
    if (a.last_session && b.last_session)
      return new Date(a.last_session).getTime() - new Date(b.last_session).getTime();
    return 0;
  }), [atRisk]);

  const staleLearners = atRisk.filter(l => {
    if (!l.last_session) return true;
    return Math.floor((Date.now() - new Date(l.last_session).getTime()) / 86_400_000) > 14;
  }).length;

  const selectStyle: React.CSSProperties = {
    background: DS.surfaceHover as string, color: DS.text as string,
    border: `1px solid ${DS.border}`, borderRadius: '10px',
    padding: '6px 10px', fontSize: '13px', outline: 'none',
  };

  return (
    <div className="space-y-5 pb-20">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label:'Total Sessions',    value:stats.total,     color:DS.primary,                  sub:'All time',               icon:Calendar     },
          { label:'This Month',        value:stats.thisMonth, color:'#A78BFA',                   sub:'Last 30 days',           icon:Activity     },
          { label:'Positive Outcomes', value:stats.posOut,    color:'var(--ds-success)',          sub:`${sessions.length ? Math.round(stats.posOut/sessions.length*100) : 0}% rate`, icon:Star },
          { label:'Active Goals',      value:activeGoals,     color:'var(--ds-warn)',             sub:`${overdueGoals} overdue`,icon:Target       },
          { label:'Goals Completed',   value:doneGoals,       color:'var(--ds-success)',          sub:'Milestones reached',     icon:CheckCircle2 },
          { label:'At-Risk Learners',  value:atRisk.length,   color:atRisk.length>0?'var(--ds-danger)':'var(--ds-success)', sub:`${staleLearners} need session`, icon:AlertTriangle },
        ].map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Trend toggle */}
      <div className="flex gap-3">
        <button onClick={() => setShowTrend(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          style={showTrend
            ? { background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }
            : { background: DS.surface,      color: DS.textMid as string, border: `1px solid ${DS.border}` }}>
          <BarChart2 className="w-4 h-4" />
          {showTrend ? 'Hide Trend' : 'Show Trend'}
          {showTrend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showTrend && <TrendChart sessions={sessions} />}

      {/* Tab + action bar */}
      <div className="rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: DS.surfaceHover }}>
          {([
            ['sessions', `Sessions (${sessions.length})`],
            ['goals',    `Goals (${activeGoals} active${overdueGoals > 0 ? `, ${overdueGoals} overdue` : ''})`],
            ['at_risk',  `At-Risk (${atRisk.length})`],
            ['mentors',  `Mentors (${mentorStats.length})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
              style={tab === key
                ? { background: DS.primary, color: '#fff' }
                : { background: 'transparent', color: DS.textMid as string }}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'goals' && (
            <button onClick={() => setShowAddGoal(s => !s)}
              className="btn-secondary text-sm whitespace-nowrap">
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          )}
          <Link href="/mentorship/new" className="btn-primary text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> Log Session
          </Link>
        </div>
      </div>

      {/* ── SESSIONS ── */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search learner, mentor, notes…"
                  className="form-input pl-9 w-full text-sm" />
              </div>
              <select value={mentorF} onChange={e => setMentorF(e.target.value)} style={selectStyle}>
                <option value="">All mentors</option>
                {mentors.map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                ))}
              </select>
              <select value={typeF} onChange={e => setTypeF(e.target.value)} style={selectStyle}>
                <option value="">All types</option>
                {Object.entries(SESSION_TYPE_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <select value={outcomeF} onChange={e => setOutcomeF(e.target.value)} style={selectStyle}>
                <option value="">All outcomes</option>
                {Object.entries(OUTCOME_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {hasFilters && (
                <button onClick={clearFilters}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                  style={{ background: DS.surfaceHover, color: DS.textMuted as string }}>
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            {hasFilters && (
              <p className="text-xs" style={{ color: DS.textMuted }}>
                Showing {filteredSessions.length} of {sessions.length} sessions
              </p>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-3xl mb-2">💬</p>
              <p className="font-medium" style={{ color: DS.textMid }}>
                {sessions.length === 0 ? 'No mentorship sessions yet' : 'No sessions match your filters'}
              </p>
              {sessions.length === 0 && (
                <Link href="/mentorship/new" className="text-sm mt-1 block hover:underline" style={{ color: DS.primary }}>
                  Log the first session →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map(s => <SessionCard key={s.id} s={s} />)}
            </div>
          )}
        </div>
      )}

      {/* ── GOALS ── */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {showAddGoal && (
            <AddGoalPanel
              learners={learners} mentors={mentors}
              currentUserId={currentUserId}
              onAdded={onAdded}
              onClose={() => setShowAddGoal(false)}
            />
          )}

          {overdueGoals > 0 && (
            <div className="px-4 py-3 rounded-2xl flex items-center gap-2"
              style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-warn)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--ds-warn)' }}>
                {overdueGoals} goal{overdueGoals !== 1 ? 's' : ''} past their target date
              </p>
            </div>
          )}

          {goals.filter(g => g.status === 'active').length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DS.textMuted }}>
                Active Goals
              </p>
              <div className="space-y-2">
                {goals.filter(g => g.status === 'active').map(g => (
                  <GoalCard key={g.id} goal={g} onComplete={onComplete} />
                ))}
              </div>
            </div>
          )}

          {goals.filter(g => g.status === 'completed').length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DS.textMuted }}>
                Completed ({doneGoals})
              </p>
              <div className="space-y-2">
                {goals.filter(g => g.status === 'completed').map(g => (
                  <GoalCard key={g.id} goal={g} onComplete={onComplete} />
                ))}
              </div>
            </div>
          )}

          {goals.length === 0 && !showAddGoal && (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-3xl mb-2">🎯</p>
              <p className="font-medium" style={{ color: DS.textMid }}>No goals set yet</p>
              <p className="text-xs mt-1" style={{ color: DS.textMuted }}>Goals are created during sessions or using the Add Goal button</p>
            </div>
          )}
        </div>
      )}

      {/* ── AT-RISK ── */}
      {tab === 'at_risk' && (
        <div className="space-y-3">
          {staleLearners > 0 && (
            <div className="px-4 py-3 rounded-2xl flex items-center gap-2"
              style={{ background: 'var(--ds-danger-light)', border: '1px solid var(--ds-danger)' }}>
              <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-danger)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--ds-danger)' }}>
                {staleLearners} high-risk learner{staleLearners !== 1 ? 's have' : ' has'} not had a session in over 14 days
              </p>
            </div>
          )}

          {sortedAtRisk.length === 0 ? (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-2xl mb-2">✅</p>
              <p className="font-medium" style={{ color: DS.textMid }}>
                No high-risk learners requiring urgent mentorship
              </p>
            </div>
          ) : sortedAtRisk.map(l => {
            const isStale = !l.last_session ||
              Math.floor((Date.now() - new Date(l.last_session).getTime()) / 86_400_000) > 14;
            return (
              <div key={l.learner_id} className="rounded-2xl p-4 transition-all"
                style={{
                  background: DS.surface,
                  border:     `1px solid ${isStale ? 'var(--ds-danger)' : DS.border}`,
                  borderLeft: `4px solid ${l.critical_interv ? 'var(--ds-danger)' : isStale ? 'var(--ds-warn)' : DS.primary}`,
                }}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/learners/${l.learner_id}`}
                        className="font-bold text-sm hover:underline" style={{ color: DS.text }}>
                        {l.learner}
                      </Link>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
                        High Risk
                      </span>
                      {l.critical_interv && (
                        <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full animate-pulse"
                          style={{ background: 'var(--ds-danger)' }}>
                          Critical Intervention
                        </span>
                      )}
                      <CadenceChip lastSession={l.last_session} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{l.school}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {l.interests.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: DS.primaryLight, color: DS.primary }}>
                          {tag}
                        </span>
                      ))}
                      {l.aspiration && (
                        <span className="text-xs" style={{ color: DS.textMuted }}>🎯 {l.aspiration}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 text-center shrink-0">
                    {[
                      { v: l.att,            l: 'Att',      bad: l.att < 75   },
                      { v: l.score,          l: 'Score',    bad: l.score < 50 },
                      { v: l.sessions_count, l: 'Sessions', bad: false        },
                    ].map(({ v, l: lbl, bad }) => (
                      <div key={lbl}>
                        <p className="text-lg font-black tabular-nums"
                          style={{ color: bad ? 'var(--ds-danger)' : DS.text }}>
                          {v}{lbl !== 'Sessions' ? '%' : ''}
                        </p>
                        <p className="text-[10px]" style={{ color: DS.textMuted }}>{lbl}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/mentorship/new?learner=${l.learner_id}`}
                      className="btn-primary text-xs px-3 py-1.5 text-center whitespace-nowrap">
                      Log Session
                    </Link>
                    {l.open_interv > 0 && (
                      <Link href={`/interventions?learner=${l.learner_id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl text-center whitespace-nowrap"
                        style={{ background: 'var(--ds-warn-light)', color: 'var(--ds-warn)', border: '1px solid var(--ds-warn)' }}>
                        {l.open_interv} Open Issue{l.open_interv !== 1 ? 's' : ''}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MENTORS ── */}
      {tab === 'mentors' && (
        <div>
          {mentorStats.length === 0 ? (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-3xl mb-2">🧑‍🏫</p>
              <p className="font-medium" style={{ color: DS.textMid }}>No mentor data yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentorStats.map(m => <MentorCard key={m.id} m={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
