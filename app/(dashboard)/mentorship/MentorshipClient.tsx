'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Target, Users, TrendingUp, Calendar, Star, AlertTriangle, Plus, Activity } from 'lucide-react';
import { fmt } from '@/utils';
import { SessionTypeBadge, OutcomeBadge, GoalStatusBadge, MOOD_EMOJI, SESSION_TYPE_CFG, OUTCOME_CFG, GOAL_STATUS } from '@/components/mentorship/MentorshipBadges';
import { KPICard } from '@/components/interventions/InterventionBadges';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session { id:string; date:string; duration:number|null; type:string; notes:string; next_steps:string; goals:string; mood:number|null; outcome:string|null; learner_id:string; learner:string; school:string; risk:string; att:number; score:number; mentor:string; mentor_id:string }
interface Goal    { id:string; title:string; desc:string; due:string|null; status:string; learner:string; learner_id:string; mentor:string; mentor_id:string; created:string }
interface AtRisk  { learner_id:string; learner:string; school:string; att:number; score:number; interests:string[]; aspiration:string|null; prog_types:string[]; sessions_count:number; last_session:string|null; open_interv:number; critical_interv:boolean }
interface MentorStat { id:string; name:string; sessions:number; learners:number; positiveRate:number; avgMood:number|null; topType:string|null }
interface Props   { sessions:Session[]; goals:Goal[]; atRisk:AtRisk[]; mentorStats:MentorStat[]; stats:any; learners:any[]; mentors:any[]; currentUserId:string }

// ─── Session card (expandable) ────────────────────────────────────────────────
function SessionCard({ s }: { s:Session }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50/50 select-none"
        onClick={() => setOpen(o => !o)}>
        <span className="text-xl mt-0.5 shrink-0">{SESSION_TYPE_CFG[s.type]?.icon ?? '📋'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/learners/${s.learner_id}`} onClick={e => e.stopPropagation()}
              className="font-bold text-sm text-gray-900 hover:text-brand-700 hover:underline">
              {s.learner}
            </Link>
            <SessionTypeBadge type={s.type} />
            <OutcomeBadge outcome={s.outcome} />
            {s.mood && <span title={`Mood ${s.mood}/5`}>{MOOD_EMOJI[s.mood]}</span>}
            {s.risk === 'high' && (
              <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">HIGH RISK</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
            <span>📅 {fmt.date(s.date)}</span>
            {s.duration && <span>⏱ {s.duration}m</span>}
            <span>🧑‍🏫 {s.mentor}</span>
            <span>🏫 {s.school}</span>
          </div>
        </div>
        <div className="hidden sm:flex gap-3 shrink-0 text-right">
          {[{v:s.att,l:'Att',bad:s.att<75},{v:s.score,l:'Score',bad:s.score<50}].map(({v,l,bad}) => (
            <div key={l}>
              <p className={`text-sm font-black tabular-nums ${bad?'text-red-500':'text-gray-600'}`}>{v}%</p>
              <p className="text-[10px] text-gray-400">{l}</p>
            </div>
          ))}
        </div>
      </div>
      {open && (s.notes || s.next_steps || s.goals) && (
        <div className="border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {s.notes      && <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Session Notes</p><p className="text-sm text-gray-600 leading-relaxed">{s.notes}</p></div>}
          {s.goals      && <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Goals Discussed</p><p className="text-sm text-gray-600 leading-relaxed">{s.goals}</p></div>}
          {s.next_steps && <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Next Steps</p><p className="text-sm text-gray-600 leading-relaxed">{s.next_steps}</p></div>}
        </div>
      )}
    </div>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onComplete }: { goal:Goal; onComplete:(id:string)=>void }) {
  const [loading, setLoading] = useState(false);
  const overdue = goal.due && new Date(goal.due) < new Date() && goal.status === 'active';

  const complete = async () => {
    setLoading(true);
    try {
      await fetch(`/api/v1/mentorship/goals/${goal.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status:'completed' }),
      });
      onComplete(goal.id);
      toast.success('Goal completed! 🎉');
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className={`rounded-2xl border p-4 ${goal.status==='completed'?'bg-green-50/30 border-green-200/50 opacity-75':'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 shrink-0">🎯</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{goal.title}</p>
            <GoalStatusBadge status={goal.status} />
            {overdue && <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">⏰ Overdue</span>}
          </div>
          {goal.desc && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{goal.desc}</p>}
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
            <span>👩‍🎓 {goal.learner}</span>
            {goal.due && <span>Due {fmt.date(goal.due)}</span>}
            <span>🧑‍🏫 {goal.mentor}</span>
          </div>
        </div>
        {goal.status === 'active' && (
          <button onClick={complete} disabled={loading}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Complete'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mentor card ──────────────────────────────────────────────────────────────
function MentorCard({ m }: { m:MentorStat }) {
  const tcfg = m.topType ? SESSION_TYPE_CFG[m.topType] : null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center text-white font-black text-sm shrink-0">
          {m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{m.name}</p>
          {tcfg && <p className="text-xs text-gray-400">{tcfg.icon} Focuses on {tcfg.label}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 px-2 py-2.5">
          <p className="text-xl font-black text-brand-700">{m.sessions}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sessions</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-2 py-2.5">
          <p className="text-xl font-black text-brand-700">{m.learners}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Learners</p>
        </div>
        <div className="rounded-xl px-2 py-2.5" style={{ background: m.positiveRate>=70?'#F0FDF4':'#F9FAFB' }}>
          <p className="text-xl font-black" style={{ color: m.positiveRate>=70?'#16A34A':'#6B7280' }}>{m.positiveRate}%</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Positive</p>
        </div>
      </div>
      {m.avgMood != null && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width:`${(m.avgMood/5)*100}%` }} />
          </div>
          <span className="text-xs text-gray-400">Avg mood {MOOD_EMOJI[Math.round(m.avgMood)]}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MentorshipClient({ sessions, goals:initialGoals, atRisk, mentorStats, stats, learners, mentors, currentUserId }: Props) {
  const [goals, setGoals] = useState(initialGoals);
  const [tab,   setTab]   = useState<'sessions'|'goals'|'at_risk'|'mentors'>('sessions');

  const now          = new Date().toISOString().slice(0,10);
  const activeGoals  = goals.filter(g => g.status === 'active').length;
  const overdueGoals = goals.filter(g => g.status==='active' && g.due && g.due < now).length;
  const doneGoals    = goals.filter(g => g.status === 'completed').length;
  const onComplete   = (id:string) => setGoals(prev => prev.map(g => g.id!==id?g:{...g,status:'completed'}));

  return (
    <div className="space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label:'Total Sessions',   value:stats.total,     color:'#1D4ED8', sub:'All time',               icon:Calendar    },
          { label:'This Month',       value:stats.thisMonth, color:'#7C3AED', sub:'Last 30 days',           icon:Activity    },
          { label:'Positive Outcomes',value:stats.posOut,    color:'#10B981', sub:`${sessions.length?Math.round(stats.posOut/sessions.length*100):0}% rate`, icon:Star },
          { label:'Active Goals',     value:activeGoals,     color:'#F59E0B', sub:`${overdueGoals} overdue`,icon:Target      },
          { label:'Goals Completed',  value:doneGoals,       color:'#10B981', sub:'Milestones reached',     icon:CheckCircle2},
          { label:'At-Risk Learners', value:atRisk.length,   color:atRisk.length>0?'#EF4444':'#10B981', sub:'Need mentorship', icon:AlertTriangle },
        ].map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl flex-wrap">
          {([
            ['sessions', `Sessions (${sessions.length})`],
            ['goals',    `Goals (${activeGoals} active${overdueGoals>0?`, ${overdueGoals} overdue`:''})`],
            ['at_risk',  `At-Risk (${atRisk.length})`],
            ['mentors',  `Mentors (${mentorStats.length})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab===key?'bg-white shadow text-gray-900':'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <Link href="/mentorship/new" className="btn-primary text-sm whitespace-nowrap">
          <Plus className="w-4 h-4" /> Log Session
        </Link>
      </div>

      {/* SESSIONS */}
      {tab === 'sessions' && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-gray-500 font-medium">No mentorship sessions yet</p>
              <Link href="/mentorship/new" className="text-sm text-brand-600 hover:underline mt-1 block">Log the first session →</Link>
            </div>
          ) : sessions.map(s => <SessionCard key={s.id} s={s} />)}
        </div>
      )}

      {/* GOALS */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {overdueGoals > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">{overdueGoals} goal{overdueGoals!==1?'s':''} past their target date</p>
            </div>
          )}
          {goals.filter(g=>g.status==='active').length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Active Goals</p>
              <div className="space-y-2">
                {goals.filter(g=>g.status==='active').map(g => <GoalCard key={g.id} goal={g} onComplete={onComplete} />)}
              </div>
            </div>
          )}
          {goals.filter(g=>g.status==='completed').length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Completed ({goals.filter(g=>g.status==='completed').length})</p>
              <div className="space-y-2">
                {goals.filter(g=>g.status==='completed').map(g => <GoalCard key={g.id} goal={g} onComplete={onComplete} />)}
              </div>
            </div>
          )}
          {goals.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-gray-500 font-medium">No goals set yet</p>
              <p className="text-xs text-gray-400 mt-1">Goals are created during mentorship sessions</p>
            </div>
          )}
        </div>
      )}

      {/* AT-RISK */}
      {tab === 'at_risk' && (
        <div className="space-y-3">
          {atRisk.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-gray-500 font-medium">No high-risk learners requiring urgent mentorship</p>
            </div>
          ) : atRisk.map(l => (
            <div key={l.learner_id} className="bg-white rounded-2xl border border-red-200 border-l-4 border-l-red-400 shadow-sm p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/learners/${l.learner_id}`}
                      className="font-bold text-sm text-gray-900 hover:text-brand-700 hover:underline">
                      {l.learner}
                    </Link>
                    <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">High Risk</span>
                    {l.critical_interv && <span className="text-xs font-black text-white bg-red-600 px-2 py-0.5 rounded-full animate-pulse">Critical Intervention</span>}
                    {!l.last_session && <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">No sessions yet</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{l.school}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {l.interests.slice(0,3).map((tag:string) => (
                      <span key={tag} className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                    {l.aspiration && <span className="text-xs text-gray-400">🎯 Future {l.aspiration}</span>}
                  </div>
                </div>
                <div className="flex gap-3 text-center shrink-0">
                  {[{v:l.att,l:'Att',bad:l.att<75},{v:l.score,l:'Score',bad:l.score<50},{v:l.sessions_count,l:'Sessions',bad:false}].map(({v,l:lbl,bad}) => (
                    <div key={lbl}>
                      <p className={`text-lg font-black tabular-nums ${bad?'text-red-600':'text-gray-700'}`}>{v}{lbl!=='Sessions'?'%':''}</p>
                      <p className="text-[10px] text-gray-400">{lbl}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link href={`/mentorship/new?learner=${l.learner_id}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-700 text-white hover:bg-brand-800 text-center whitespace-nowrap">
                    Log Session
                  </Link>
                  {l.open_interv > 0 && (
                    <Link href={`/interventions?learner=${l.learner_id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 text-center whitespace-nowrap">
                      {l.open_interv} Open Issue{l.open_interv!==1?'s':''}
                    </Link>
                  )}
                </div>
              </div>
              {l.last_session && (
                <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                  Last session: {fmt.date(l.last_session)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MENTORS */}
      {tab === 'mentors' && (
        <div>
          {mentorStats.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-3xl mb-2">🧑‍🏫</p>
              <p className="text-gray-500 font-medium">No mentor data yet</p>
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
