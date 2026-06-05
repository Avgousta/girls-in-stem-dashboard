'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Loader2, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Minus, AlertTriangle, X, Search,
} from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Assessment { id:string; type:string; difficulty:string; skills:string[]; term:number|null; subject:string; score:number; max_score:number; pct:number; grade:string|null; date:string; notes:string; strengths:string; improvements:string; actions:string; weighting:number; learner_id:string; learner:string; learner_code:string; school:string; grade_level:number; programme:string; prog_id:string; captured_by:string }
interface LearnerRow { id:string; code:string; name:string; school:string; grade:number; risk:string; avgScore:number; trend:string; total:number; skills:Array<{name:string;avg:number;count:number}>; weakest:string|null; strongest:string|null }
interface Stats { total:number; avg:number; bands:Record<string,number>; declining:number; atRisk:number }
interface Props { assessments:Assessment[]; learners:LearnerRow[]; programs:any[]; stats:Stats; subjectStats:any[]; currentUserId:string; role:string }

// ─── Config ───────────────────────────────────────────────────────────────────
const GRADE_CFG = {
  'Distinction':   { color: 'var(--ds-success)', bg: 'var(--ds-success-light)' },
  'Merit':         { color: '#818CF8',            bg: 'rgba(129,140,248,0.15)' },
  'Pass':          { color: 'var(--ds-warn)',     bg: 'var(--ds-warn-light)'   },
  'Needs Support': { color: 'var(--ds-danger)',   bg: 'var(--ds-danger-light)' },
};
const TYPE_CFG: Record<string,{icon:string;label:string}> = {
  quiz:       { icon:'⚡', label:'Quiz'       },
  test:       { icon:'📝', label:'Test'       },
  project:    { icon:'🚀', label:'Project'    },
  practical:  { icon:'🔬', label:'Practical'  },
  assignment: { icon:'📋', label:'Assignment' },
  oral:       { icon:'🗣️', label:'Oral'      },
  other:      { icon:'📄', label:'Other'      },
};
const DIFF_CFG: Record<string,{color:string;label:string}> = {
  easy:     { color: 'var(--ds-success)', label:'Easy'     },
  medium:   { color: 'var(--ds-warn)',    label:'Medium'   },
  hard:     { color: 'var(--ds-danger)',  label:'Hard'     },
  advanced: { color: DS.primary,          label:'Advanced' },
};

function scoreColor(v: number) {
  return v >= 80 ? 'var(--ds-success)' : v >= 70 ? '#818CF8' : v >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)';
}

// ─── Micro-components ─────────────────────────────────────────────────────────
const GradeBadge = ({ grade }: { grade: string | null }) => {
  if (!grade) return <span className="text-xs" style={{ color: DS.textMuted }}>—</span>;
  const c = GRADE_CFG[grade as keyof typeof GRADE_CFG] ?? GRADE_CFG['Pass'];
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}>
      {grade}
    </span>
  );
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up')   return <TrendingUp   className="w-4 h-4" style={{ color: 'var(--ds-success)' }} />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4" style={{ color: 'var(--ds-danger)'  }} />;
  return <Minus className="w-4 h-4" style={{ color: DS.textMuted }} />;
};

const MiniBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
      <div className="h-full rounded-full" style={{ width:`${value}%`, background:color }} />
    </div>
    <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color }}>{value}%</span>
  </div>
);

const selectSt: React.CSSProperties = {
  background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '7px 10px', fontSize: '13px', outline: 'none',
};

const thSt: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
};

// ─── Assessment row ────────────────────────────────────────────────────────────
function AssessmentRow({ a, onFeedback }: { a: Assessment; onFeedback: (id:string, data:any) => void }) {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [fb, setFb] = useState({ strengths: a.strengths, improvements: a.improvements, actions: a.actions });
  const tc = TYPE_CFG[a.type] ?? TYPE_CFG.other;

  const saveFeedback = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/assessments/${a.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ feedback_strengths: fb.strengths, feedback_improvements: fb.improvements, feedback_actions: fb.actions }),
      });
      if (!res.ok) throw new Error('Failed');
      onFeedback(a.id, fb);
      toast.success('Feedback saved');
    } catch { toast.error('Could not save feedback'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
        onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.background = DS.surfaceHover as string; }}
        onMouseOut={e =>  { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
        {open
          ? <ChevronDown  className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />
          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />}
        <span className="text-base shrink-0">{tc.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/learners/${a.learner_id}`} onClick={e => e.stopPropagation()}
              className="text-sm font-semibold hover:underline" style={{ color: DS.text }}>
              {a.learner}
            </Link>
            <GradeBadge grade={a.grade} />
            {a.skills.slice(0,2).map(sk => (
              <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: DS.primaryLight, color: DS.primary }}>{sk}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-0.5 text-xs" style={{ color: DS.textMuted }}>
            <span>{a.subject}</span><span>·</span>
            <span>{tc.label}</span><span>·</span>
            <span>{a.programme}</span><span>·</span>
            <span>{fmt.date(a.date)}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-base font-black tabular-nums" style={{ color: scoreColor(a.pct) }}>{a.pct}%</p>
            <p className="text-[10px]" style={{ color: DS.textMuted }}>{a.score}/{a.max_score}</p>
          </div>
          {(a.strengths || a.improvements) && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>✓ Feedback</span>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 py-4" style={{ borderTop: `1px solid ${DS.border}`, background: DS.surfaceHover as string }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Score',       value: `${a.score}/${a.max_score} (${a.pct}%)` },
                  { label:'Type',        value: `${tc.icon} ${tc.label}` },
                  { label:'Difficulty',  value: <span style={{ color: DIFF_CFG[a.difficulty]?.color }}>{DIFF_CFG[a.difficulty]?.label}</span> },
                  { label:'Captured by', value: a.captured_by },
                  ...(a.term ? [{ label:'Term', value: `Term ${a.term}` }] : []),
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>{label}</p>
                    <p className="text-sm font-semibold" style={{ color: DS.textMid }}>{value}</p>
                  </div>
                ))}
              </div>
              {a.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>Notes</p>
                  <p className="text-sm leading-relaxed" style={{ color: DS.textMid }}>{a.notes}</p>
                </div>
              )}
              {a.skills.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Skills Assessed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.skills.map(sk => (
                      <span key={sk} className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>{sk}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Link href={`/learners/${a.learner_id}`}
                  className="flex-1 text-xs font-semibold text-center py-2 rounded-xl transition-colors"
                  style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
                  View Learner →
                </Link>
                <Link href={`/interventions/new?learner=${a.learner_id}`}
                  className="flex-1 text-xs font-semibold text-center py-2 rounded-xl transition-colors"
                  style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)', border: '1px solid var(--ds-danger)' }}>
                  Log Intervention
                </Link>
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: DS.textMuted }}>Structured Feedback</p>
              {[
                { key:'strengths'    as const, label:'✅ Strengths',          placeholder:"What did this learner do well?" },
                { key:'improvements' as const, label:'📈 Areas to Improve',   placeholder:"What should they work on?" },
                { key:'actions'      as const, label:'🎯 Recommended Actions',placeholder:"Specific next steps…" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>{label}</label>
                  <textarea value={fb[key]} onChange={e => setFb(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} rows={2}
                    className="form-input w-full text-xs resize-none" />
                </div>
              ))}
              <button onClick={saveFeedback} disabled={saving} className="btn-primary text-xs w-full justify-center">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ''}
                {saving ? 'Saving…' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Learner intelligence card ─────────────────────────────────────────────────
function LearnerIntelCard({ l }: { l: LearnerRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: DS.surface,
        border: `1px solid ${l.risk === 'high' ? 'var(--ds-danger)' : l.avgScore < 50 ? 'var(--ds-warn)' : DS.border}`,
      }}>
      <div className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
        onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.background = DS.surfaceHover as string; }}
        onMouseOut={e =>  { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
        {open
          ? <ChevronDown  className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />
          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
          style={{ background: `linear-gradient(135deg,${DS.primary},#6D28D9)` }}>
          {l.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/learners/${l.id}`} onClick={e => e.stopPropagation()}
              className="text-sm font-bold hover:underline" style={{ color: DS.text }}>
              {l.name}
            </Link>
            <TrendIcon trend={l.trend} />
            {l.risk === 'high' && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>High Risk</span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
            {l.school} · Grade {l.grade} · {l.total} assessments
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black tabular-nums" style={{ color: scoreColor(l.avgScore) }}>{l.avgScore}%</p>
          <p className="text-[10px]" style={{ color: DS.textMuted }}>Average</p>
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-4" style={{ borderTop: `1px solid ${DS.border}` }}>
          {l.skills.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>Skill Breakdown</p>
              <div className="space-y-2">
                {l.skills.map(sk => (
                  <div key={sk.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium" style={{ color: DS.textMid }}>{sk.name}</span>
                      <span style={{ color: DS.textMuted }}>{sk.count} result{sk.count!==1?'s':''}</span>
                    </div>
                    <MiniBar value={sk.avg} color={scoreColor(sk.avg)} />
                  </div>
                ))}
              </div>
              {l.weakest && (
                <div className="mt-3 p-3 rounded-xl"
                  style={{ background: 'var(--ds-danger-light)', border: '1px solid var(--ds-danger)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ds-danger)' }}>
                    ⚠ Weakest: <strong>{l.weakest}</strong>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ds-danger)' }}>Consider additional support in this skill</p>
                </div>
              )}
              {l.strongest && (
                <div className="mt-2 p-3 rounded-xl"
                  style={{ background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ds-success)' }}>
                    ✅ Strongest: <strong>{l.strongest}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
          {l.skills.length === 0 && l.total > 0 && (
            <p className="text-xs" style={{ color: DS.textMuted }}>
              No skill tags on assessments yet. Add skill tags when capturing marks for richer insights.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Link href={`/learners/${l.id}`}
              className="flex-1 text-xs font-semibold text-center py-2 rounded-xl transition-colors"
              style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
              Full Profile →
            </Link>
            {l.avgScore < 50 && (
              <Link href={`/interventions/new?learner=${l.id}`}
                className="flex-1 text-xs font-semibold text-center py-2 rounded-xl transition-colors"
                style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)', border: '1px solid var(--ds-danger)' }}>
                ⚠ Intervene
              </Link>
            )}
            <Link href={`/mentorship/new?learner=${l.id}`}
              className="flex-1 text-xs font-semibold text-center py-2 rounded-xl transition-colors"
              style={{ background: DS.primaryLight, color: '#A78BFA', border: `1px solid ${DS.primaryBorder}` }}>
              💬 Mentor
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AssessmentsClient({ assessments: initAss, learners, programs, stats, subjectStats, currentUserId, role }: Props) {
  const [assessments, setAssessments] = useState(initAss);
  const [tab,    setTab]    = useState<'overview'|'assessments'|'learners'|'subjects'>('overview');
  const [search, setSearch] = useState('');
  const [typeF,  setTypeF]  = useState('');
  const [gradeF, setGradeF] = useState('');
  const [progF,  setProgF]  = useState('');

  const onFeedback = (id: string, data: any) =>
    setAssessments(prev => prev.map(a => a.id !== id ? a : { ...a, ...data }));

  const filteredAss = useMemo(() => {
    const q = search.toLowerCase();
    return assessments.filter(a => {
      if (typeF  && a.type    !== typeF)  return false;
      if (gradeF && a.grade   !== gradeF) return false;
      if (progF  && a.prog_id !== progF)  return false;
      if (q && !`${a.learner} ${a.subject} ${a.programme} ${a.school}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assessments, search, typeF, gradeF, progF]);

  const declining = learners.filter(l => l.trend === 'down' && l.total >= 3);
  const atRisk    = learners.filter(l => l.avgScore < 50 && l.total >= 1);
  const bandPct   = (b: string) => stats.total ? Math.round((stats.bands[b] || 0) / stats.total * 100) : 0;

  return (
    <div className="space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-2xl overflow-hidden"
        style={{ background: DS.border, border: `1px solid ${DS.border}` }}>
        {[
          { label:'Total Assessments', value: stats.total,                    color: DS.primary,                 sub:'All records'               },
          { label:'Platform Average',  value: `${stats.avg}%`,               color: scoreColor(stats.avg),      sub:'All subjects'              },
          { label:'Distinctions',      value: stats.bands['Distinction']||0,  color: 'var(--ds-success)',        sub:`${bandPct('Distinction')}% of total`   },
          { label:'Needs Support',     value: stats.bands['Needs Support']||0,color: stats.bands['Needs Support']>0?'var(--ds-danger)':'var(--ds-success)', sub:`${bandPct('Needs Support')}% of total` },
          { label:'Declining Trend',   value: declining.length,              color: declining.length>0?'var(--ds-danger)':'var(--ds-success)', sub:'3+ assessments down' },
          { label:'At Risk (Score)',   value: atRisk.length,                 color: atRisk.length>0?'var(--ds-danger)':'var(--ds-success)',   sub:'Below 50% avg' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="p-4" style={{ background: DS.surface }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>{label}</p>
            <p className="text-3xl font-black tabular-nums mt-1" style={{ color }}>{value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: DS.textMuted }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {declining.length > 0 && (
        <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'var(--ds-danger-light)', border: '1px solid var(--ds-danger)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--ds-danger)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--ds-danger)' }}>
              {declining.length} learner{declining.length!==1?'s':''} showing declining performance
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ds-danger)' }}>
              {declining.slice(0,3).map(l=>l.name).join(', ')}{declining.length>3?` +${declining.length-3} more`:''} — consider intervention or mentorship review.
            </p>
          </div>
          <button onClick={() => setTab('learners')}
            className="text-xs font-bold hover:underline shrink-0 cursor-pointer" style={{ color: 'var(--ds-danger)' }}>
            View →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: DS.surfaceHover }}>
        {([
          ['overview',    'Overview'],
          ['assessments', `Records (${assessments.length})`],
          ['learners',    `Learner Intelligence (${learners.length})`],
          ['subjects',    `Subjects (${subjectStats.length})`],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2 px-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer"
            style={tab === key
              ? { background: DS.primary, color: '#fff' }
              : { background: 'transparent', color: DS.textMid as string }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Grade distribution */}
          <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <p className="text-sm font-bold mb-5" style={{ color: DS.text }}>Grade Distribution</p>
            <div className="space-y-4">
              {[
                { grade:'Distinction',   color:'var(--ds-success)', range:'80%+' },
                { grade:'Merit',         color:'#818CF8',           range:'70–79%' },
                { grade:'Pass',          color:'var(--ds-warn)',    range:'50–69%' },
                { grade:'Needs Support', color:'var(--ds-danger)',  range:'Below 50%' },
              ].map(({ grade, color, range }) => {
                const count = stats.bands[grade] || 0;
                const pct   = stats.total ? Math.round(count/stats.total*100) : 0;
                return (
                  <div key={grade}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: DS.text }}>{grade}</span>
                        <span style={{ color: DS.textMuted }}>{range}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-bold tabular-nums" style={{ color }}>{count}</span>
                        <span style={{ color: DS.textMuted }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                      <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject performance */}
          <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <p className="text-sm font-bold mb-5" style={{ color: DS.text }}>Performance by Subject</p>
            {subjectStats.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: DS.textMuted }}>No assessment data yet</p>
            ) : (
              <div className="space-y-3">
                {subjectStats.slice(0,8).map(s => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium" style={{ color: DS.textMid }}>{s.name}</span>
                      <div className="flex gap-2">
                        <span style={{ color: DS.textMuted }}>{s.count} result{s.count!==1?'s':''}</span>
                        <span className="font-bold tabular-nums" style={{ color:scoreColor(s.avg) }}>{s.avg}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                      <div className="h-full rounded-full" style={{ width:`${s.avg}%`, background:scoreColor(s.avg) }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Score sparkline */}
          {assessments.length >= 5 && (
            <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-sm font-bold mb-4" style={{ color: DS.text }}>Recent Score Trend (last 20 assessments)</p>
              <div className="flex items-end gap-1 h-16">
                {assessments.slice(0, 20).map((a, i) => {
                  const h = Math.max(6, Math.round((a.pct / 100) * 64));
                  return (
                    <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                      style={{ height:h, background:scoreColor(a.pct) }}
                      title={`${a.learner}: ${a.pct}% — ${a.subject}`} />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] mt-1" style={{ color: DS.textMuted }}>
                <span>Most Recent</span><span>Older</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RECORDS ── */}
      {tab === 'assessments' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search learner, subject, programme…"
                  className="form-input pl-9 w-full text-sm" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                    <X className="w-3.5 h-3.5" style={{ color: DS.textMuted }} />
                  </button>
                )}
              </div>
              <select value={typeF} onChange={e => setTypeF(e.target.value)} style={{ ...selectSt, width: '140px' }}>
                <option value="">All types</option>
                {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <select value={gradeF} onChange={e => setGradeF(e.target.value)} style={{ ...selectSt, width: '160px' }}>
                <option value="">All grades</option>
                {['Distinction','Merit','Pass','Needs Support'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={progF} onChange={e => setProgF(e.target.value)} style={{ ...selectSt, flex: '1', maxWidth: '192px' }}>
                <option value="">All programmes</option>
                {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
              </select>
              {(search||typeF||gradeF||progF) && (
                <button onClick={() => { setSearch(''); setTypeF(''); setGradeF(''); setProgF(''); }}
                  className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: DS.textMuted }}>
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
              <span className="text-xs ml-auto" style={{ color: DS.textMuted }}>{filteredAss.length} results</span>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            {filteredAss.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>No assessments match your filters</div>
            ) : filteredAss.map(a => <AssessmentRow key={a.id} a={a} onFeedback={onFeedback} />)}
          </div>
        </div>
      )}

      {/* ── LEARNER INTELLIGENCE ── */}
      {tab === 'learners' && (
        <div className="space-y-4">
          {declining.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: 'var(--ds-danger)' }}>
                <TrendingDown className="w-3.5 h-3.5" /> Declining Performance — Needs Attention
              </p>
              <div className="space-y-2">
                {declining.map(l => <LearnerIntelCard key={l.id} l={l} />)}
              </div>
            </div>
          )}
          {atRisk.filter(l => l.trend !== 'down').length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--ds-warn)' }}>
                ⚠ Low Average Score
              </p>
              <div className="space-y-2">
                {atRisk.filter(l => l.trend !== 'down').map(l => <LearnerIntelCard key={l.id} l={l} />)}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>All Learners</p>
            <div className="space-y-2">
              {learners.filter(l => l.trend !== 'down' && l.avgScore >= 50 && l.total > 0).map(l => <LearnerIntelCard key={l.id} l={l} />)}
            </div>
          </div>
          {learners.filter(l => l.total === 0).length > 0 && (
            <p className="text-xs text-center py-2" style={{ color: DS.textMuted }}>
              {learners.filter(l=>l.total===0).length} learners have no assessments yet
            </p>
          )}
        </div>
      )}

      {/* ── SUBJECTS ── */}
      {tab === 'subjects' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
            <p className="text-sm font-bold" style={{ color: DS.text }}>{subjectStats.length} Subjects</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Subject','Assessments','Avg Score','Performance',''].map(h => (
                  <th key={h} style={thSt}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjectStats.map(s => (
                <tr key={s.name} style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: DS.text }}>{s.name}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: DS.textMuted }}>{s.count}</td>
                  <td className="px-4 py-3">
                    <span className="font-black tabular-nums" style={{ color:scoreColor(s.avg) }}>{s.avg}%</span>
                  </td>
                  <td className="px-4 py-3 w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                        <div className="h-full rounded-full" style={{ width:`${s.avg}%`, background:scoreColor(s.avg) }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.avg < 60 && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--ds-danger)' }}>⚠ Needs attention</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
