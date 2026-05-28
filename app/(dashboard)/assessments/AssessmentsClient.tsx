'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Loader2, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, Target, BarChart3, X, Search,
} from 'lucide-react';
import { fmt } from '@/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Assessment { id:string; type:string; difficulty:string; skills:string[]; term:number|null; subject:string; score:number; max_score:number; pct:number; grade:string|null; date:string; notes:string; strengths:string; improvements:string; actions:string; weighting:number; learner_id:string; learner:string; learner_code:string; school:string; grade_level:number; programme:string; prog_id:string; captured_by:string }
interface LearnerRow { id:string; code:string; name:string; school:string; grade:number; risk:string; avgScore:number; trend:string; total:number; skills:Array<{name:string;avg:number;count:number}>; weakest:string|null; strongest:string|null }
interface Stats { total:number; avg:number; bands:Record<string,number>; declining:number; atRisk:number }
interface Props { assessments:Assessment[]; learners:LearnerRow[]; programs:any[]; stats:Stats; subjectStats:any[]; currentUserId:string; role:string }

// ─── Design constants ─────────────────────────────────────────────────────────
const GRADE_CFG = {
  'Distinction':   { bg:'#ECFDF5', color:'#059669', border:'#A7F3D0' },
  'Merit':         { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE' },
  'Pass':          { bg:'#FFFBEB', color:'#D97706', border:'#FDE68A' },
  'Needs Support': { bg:'#FEF2F2', color:'#DC2626', border:'#FECACA' },
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
  easy:     { color:'#10B981', label:'Easy'     },
  medium:   { color:'#F59E0B', label:'Medium'   },
  hard:     { color:'#EF4444', label:'Hard'     },
  advanced: { color:'#7C3AED', label:'Advanced' },
};

function scoreColor(v: number) { return v >= 80 ? '#059669' : v >= 70 ? '#1D4ED8' : v >= 50 ? '#D97706' : '#DC2626'; }

// ─── Micro-components ─────────────────────────────────────────────────────────
const GradeBadge = ({ grade }: { grade: string | null }) => {
  if (!grade) return <span className="text-gray-300 text-xs">—</span>;
  const c = GRADE_CFG[grade as keyof typeof GRADE_CFG] ?? GRADE_CFG['Pass'];
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ background:c.bg, color:c.color, borderColor:c.border }}>{grade}</span>;
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up')   return <TrendingUp   className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500"   />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const MiniBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width:`${value}%`, background:color }} />
    </div>
    <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color }}>{value}%</span>
  </div>
);

// ─── Assessment row (expandable with feedback) ────────────────────────────────
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
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
        <span className="text-base shrink-0">{tc.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/learners/${a.learner_id}`} onClick={e => e.stopPropagation()}
              className="text-sm font-semibold text-gray-800 hover:text-brand-700 hover:underline">
              {a.learner}
            </Link>
            <GradeBadge grade={a.grade} />
            {a.skills.length > 0 && a.skills.slice(0,2).map(sk => (
              <span key={sk} className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">{sk}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-400">
            <span>{a.subject}</span>
            <span>·</span>
            <span>{tc.label}</span>
            <span>·</span>
            <span>{a.programme}</span>
            <span>·</span>
            <span>{fmt.date(a.date)}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0 text-right">
          <div>
            <p className="text-base font-black tabular-nums" style={{ color: scoreColor(a.pct) }}>{a.pct}%</p>
            <p className="text-[10px] text-gray-400">{a.score}/{a.max_score}</p>
          </div>
          {(a.strengths || a.improvements) && (
            <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">✓ Feedback</span>
          )}
        </div>
      </div>

      {open && (
        <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: details */}
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
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-700">{value}</p>
                  </div>
                ))}
              </div>
              {a.notes && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{a.notes}</p>
                </div>
              )}
              {a.skills.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Skills Assessed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.skills.map(sk => (
                      <span key={sk} className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full font-medium">{sk}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Link href={`/learners/${a.learner_id}`}
                  className="flex-1 text-xs font-semibold text-center py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors">
                  View Learner →
                </Link>
                <Link href={`/interventions/new?learner=${a.learner_id}`}
                  className="flex-1 text-xs font-semibold text-center py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">
                  Log Intervention
                </Link>
              </div>
            </div>

            {/* Right: structured feedback */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Structured Feedback</p>
              {[
                { key:'strengths' as const, label:'✅ Strengths', placeholder:'What did this learner do well?' },
                { key:'improvements' as const, label:'📈 Areas to Improve', placeholder:'What should they work on?' },
                { key:'actions' as const, label:'🎯 Recommended Actions', placeholder:'Specific next steps for this learner…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
                  <textarea value={fb[key]} onChange={e => setFb(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} rows={2}
                    className="form-input w-full text-xs resize-none" />
                </div>
              ))}
              <button onClick={saveFeedback} disabled={saving}
                className="btn-primary text-xs w-full justify-center">
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
  const riskColor = l.risk === 'high' ? '#DC2626' : l.risk === 'medium' ? '#D97706' : '#10B981';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
      ${l.risk === 'high' ? 'border-red-200' : l.avgScore < 50 ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50/50 select-none"
        onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
          style={{ background: `linear-gradient(135deg,#1D4ED8,#7C3AED)` }}>
          {l.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/learners/${l.id}`} onClick={e => e.stopPropagation()}
              className="text-sm font-bold text-gray-800 hover:text-brand-700 hover:underline">
              {l.name}
            </Link>
            <TrendIcon trend={l.trend} />
            {l.risk === 'high' && <span className="text-[10px] font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">High Risk</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{l.school} · Grade {l.grade} · {l.total} assessments</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black tabular-nums" style={{ color: scoreColor(l.avgScore) }}>{l.avgScore}%</p>
          <p className="text-[10px] text-gray-400">Average</p>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Skill breakdown */}
          {l.skills.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Skill Breakdown</p>
              <div className="space-y-2">
                {l.skills.map(sk => (
                  <div key={sk.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-600">{sk.name}</span>
                      <span className="text-gray-400">{sk.count} result{sk.count!==1?'s':''}</span>
                    </div>
                    <MiniBar value={sk.avg} color={scoreColor(sk.avg)} />
                  </div>
                ))}
              </div>
              {l.weakest && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs font-semibold text-red-700">⚠ Weakest area: <strong>{l.weakest}</strong></p>
                  <p className="text-xs text-red-600 mt-0.5">Consider additional support or mentorship focus in this skill</p>
                </div>
              )}
              {l.strongest && (
                <div className="mt-2 p-3 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-xs font-semibold text-green-700">✅ Strongest area: <strong>{l.strongest}</strong></p>
                </div>
              )}
            </div>
          )}
          {l.skills.length === 0 && l.total > 0 && (
            <p className="text-xs text-gray-400">No skill tags on assessments yet. Add skill tags when capturing marks for richer insights.</p>
          )}
          <div className="flex gap-2 pt-1">
            <Link href={`/learners/${l.id}`}
              className="flex-1 text-xs font-semibold text-center py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors">
              Full Profile →
            </Link>
            {l.avgScore < 50 && (
              <Link href={`/interventions/new?learner=${l.id}`}
                className="flex-1 text-xs font-semibold text-center py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">
                ⚠ Intervene
              </Link>
            )}
            <Link href={`/mentorship/new?learner=${l.id}`}
              className="flex-1 text-xs font-semibold text-center py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors">
              💬 Mentor
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssessmentsClient({ assessments: initAss, learners, programs, stats, subjectStats, currentUserId, role }: Props) {
  const [assessments, setAssessments] = useState(initAss);
  const [tab, setTab]     = useState<'overview'|'assessments'|'learners'|'subjects'>('overview');
  const [search, setSearch] = useState('');
  const [typeF,  setTypeF]  = useState('');
  const [gradeF, setGradeF] = useState('');
  const [progF,  setProgF]  = useState('');

  const onFeedback = (id: string, data: any) => {
    setAssessments(prev => prev.map(a => a.id !== id ? a : { ...a, ...data }));
  };

  const filteredAss = useMemo(() => {
    const q = search.toLowerCase();
    return assessments.filter(a => {
      if (typeF  && a.type     !== typeF)  return false;
      if (gradeF && a.grade    !== gradeF) return false;
      if (progF  && a.prog_id  !== progF)  return false;
      if (q && !`${a.learner} ${a.subject} ${a.programme} ${a.school}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assessments, search, typeF, gradeF, progF]);

  const declining = learners.filter(l => l.trend === 'down' && l.total >= 3);
  const atRisk    = learners.filter(l => l.avgScore < 50 && l.total >= 1);

  const bandPct = (b: string) => stats.total ? Math.round((stats.bands[b] || 0) / stats.total * 100) : 0;

  return (
    <div className="space-y-5">

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-2xl overflow-hidden border border-gray-200 bg-gray-200">
        {[
          { label:'Total Assessments', value:stats.total,        color:'#1D4ED8', sub:'All records'          },
          { label:'Platform Average',  value:`${stats.avg}%`,    color:scoreColor(stats.avg), sub:'All subjects' },
          { label:'Distinctions',      value:stats.bands['Distinction']||0,    color:'#059669', sub:`${bandPct('Distinction')}% of total`   },
          { label:'Needs Support',     value:stats.bands['Needs Support']||0,  color:stats.bands['Needs Support']>0?'#DC2626':'#10B981', sub:`${bandPct('Needs Support')}% of total` },
          { label:'Declining Trend',   value:declining.length,   color:declining.length>0?'#DC2626':'#10B981', sub:'3+ assessments down'    },
          { label:'At Risk (Score)',   value:atRisk.length,      color:atRisk.length>0?'#EF4444':'#10B981',  sub:'Below 50% avg'           },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="text-3xl font-black tabular-nums mt-1" style={{ color }}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Alert banners ── */}
      {declining.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-800">
              {declining.length} learner{declining.length!==1?'s':''} showing declining performance
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {declining.slice(0,3).map(l=>l.name).join(', ')}{declining.length>3?` +${declining.length-3} more`:''} — consider intervention or mentorship review.
            </p>
          </div>
          <button onClick={() => setTab('learners')}
            className="text-xs font-bold text-red-700 hover:underline shrink-0">View →</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          ['overview',    'Overview'],
          ['assessments', `Records (${assessments.length})`],
          ['learners',    `Learner Intelligence (${learners.length})`],
          ['subjects',    `Subjects (${subjectStats.length})`],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
              ${tab===key?'bg-white shadow text-gray-900':'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Grade distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-800 mb-5">Grade Distribution</p>
            <div className="space-y-4">
              {[
                { grade:'Distinction',    color:'#059669', range:'80%+' },
                { grade:'Merit',          color:'#1D4ED8', range:'70–79%' },
                { grade:'Pass',           color:'#D97706', range:'50–69%' },
                { grade:'Needs Support',  color:'#DC2626', range:'Below 50%' },
              ].map(({ grade, color, range }) => {
                const count = stats.bands[grade] || 0;
                const pct   = stats.total ? Math.round(count/stats.total*100) : 0;
                return (
                  <div key={grade}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{grade}</span>
                        <span className="text-gray-400">{range}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-bold tabular-nums" style={{ color }}>{count}</span>
                        <span className="text-gray-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject performance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-800 mb-5">Performance by Subject</p>
            {subjectStats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No assessment data yet</p>
            ) : (
              <div className="space-y-3">
                {subjectStats.slice(0,8).map(s => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{s.name}</span>
                      <div className="flex gap-2">
                        <span className="text-gray-400">{s.count} result{s.count!==1?'s':''}</span>
                        <span className="font-bold tabular-nums" style={{ color:scoreColor(s.avg) }}>{s.avg}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${s.avg}%`, background:scoreColor(s.avg) }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sparkline trend */}
          {assessments.length >= 5 && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">Recent Score Trend (last 20 assessments)</p>
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
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Most Recent</span><span>Older</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ASSESSMENT RECORDS ── */}
      {tab === 'assessments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search learner, subject, programme…" className="form-input pl-9 w-full text-sm" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
              <select value={typeF} onChange={e => setTypeF(e.target.value)} className="form-select text-sm w-36">
                <option value="">All types</option>
                {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <select value={gradeF} onChange={e => setGradeF(e.target.value)} className="form-select text-sm w-40">
                <option value="">All grades</option>
                {['Distinction','Merit','Pass','Needs Support'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={progF} onChange={e => setProgF(e.target.value)} className="form-select text-sm flex-1 max-w-48">
                <option value="">All programmes</option>
                {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
              </select>
              {(search||typeF||gradeF||progF) && (
                <button onClick={() => { setSearch(''); setTypeF(''); setGradeF(''); setProgF(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
              <span className="text-xs text-gray-400 ml-auto">{filteredAss.length} results</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredAss.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No assessments match your filters</div>
            ) : filteredAss.map(a => (
              <AssessmentRow key={a.id} a={a} onFeedback={onFeedback} />
            ))}
          </div>
        </div>
      )}

      {/* ── LEARNER INTELLIGENCE ── */}
      {tab === 'learners' && (
        <div className="space-y-4">
          {declining.length > 0 && (
            <div>
              <p className="text-xs font-black text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Declining Performance — Needs Attention
              </p>
              <div className="space-y-2">
                {declining.map(l => <LearnerIntelCard key={l.id} l={l} />)}
              </div>
            </div>
          )}
          {atRisk.filter(l => l.trend !== 'down').length > 0 && (
            <div>
              <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-2">⚠ Low Average Score</p>
              <div className="space-y-2">
                {atRisk.filter(l => l.trend !== 'down').map(l => <LearnerIntelCard key={l.id} l={l} />)}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">All Learners</p>
            <div className="space-y-2">
              {learners.filter(l => l.trend !== 'down' && l.avgScore >= 50 && l.total > 0).map(l => <LearnerIntelCard key={l.id} l={l} />)}
            </div>
          </div>
          {learners.filter(l => l.total === 0).length > 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              {learners.filter(l=>l.total===0).length} learners have no assessments yet
            </p>
          )}
        </div>
      )}

      {/* ── SUBJECTS ── */}
      {tab === 'subjects' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">{subjectStats.length} Subjects</p>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Subject</th><th>Assessments</th><th>Avg Score</th><th>Performance</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {subjectStats.map(s => (
                <tr key={s.name}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="text-gray-500 tabular-nums">{s.count}</td>
                  <td>
                    <span className="font-black tabular-nums" style={{ color:scoreColor(s.avg) }}>{s.avg}%</span>
                  </td>
                  <td className="w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width:`${s.avg}%`, background:scoreColor(s.avg) }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    {s.avg < 60 && (
                      <span className="text-xs text-red-600 font-semibold">⚠ Needs attention</span>
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
