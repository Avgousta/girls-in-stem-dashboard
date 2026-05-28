import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import MentorshipClient from './MentorshipClient';
import Link from 'next/link';
import { HeartHandshake, Plus } from 'lucide-react';

async function getPageData() {
  const supabase = await createClient();

  const [sessionsRes, goalsRes, atRiskRes, learnersRes, mentorsRes] = await Promise.all([

    supabase.from('mentorship_sessions').select(`
      session_id, session_date, duration_minutes, session_type,
      notes, next_steps, goals_discussed, learner_mood, outcome, created_at,
      learner_id,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name),
        risk_scores(risk_level, attendance_rate, avg_score)
      ),
      mentor:users!mentor_id(user_id, full_name)
    `).order('session_date', { ascending: false }).limit(200),

    supabase.from('mentorship_goals').select(`
      goal_id, title, description, target_date, status, created_at,
      learner_id,
      learners!inner(learner_profiles(first_name, last_name), schools(school_name)),
      mentor:users!mentor_id(user_id, full_name)
    `).order('created_at', { ascending: false }),

    // High-risk learners with context
    supabase.from('risk_scores').select(`
      risk_level, attendance_rate, avg_score,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name, interests, aspiration),
        schools(school_name),
        program_enrollments(programs(program_name, program_type)),
        mentorship_sessions(session_id, session_date),
        interventions(intervention_id, status, priority)
      )
    `).eq('risk_level', 'high'),

    supabase.from('learners')
      .select('learner_id, learner_code, learner_profiles(first_name, last_name, interests, aspiration), schools(school_name), program_enrollments(programs(program_name, program_type)), risk_scores(risk_level)')
      .eq('programme_status', 'active').order('learner_code'),

    supabase.from('users')
      .select('user_id, full_name, role')
      .in('role', ['admin','instructor']).order('full_name'),
  ]);

  const sessions = (sessionsRes.data || []).map((s: any) => ({
    id:         s.session_id,
    date:       s.session_date,
    duration:   s.duration_minutes,
    type:       s.session_type || 'check_in',
    notes:      s.notes       || '',
    next_steps: s.next_steps  || '',
    goals:      s.goals_discussed || '',
    mood:       s.learner_mood,
    outcome:    s.outcome,
    learner_id: s.learner_id,
    learner:    `${s.learners?.learner_profiles?.first_name ?? ''} ${s.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    school:     s.learners?.schools?.school_name ?? '—',
    risk:       s.learners?.risk_scores?.risk_level ?? 'low',
    att:        Math.round(s.learners?.risk_scores?.attendance_rate ?? 0),
    score:      Math.round(s.learners?.risk_scores?.avg_score ?? 0),
    mentor:     (s.mentor as any)?.full_name ?? '—',
    mentor_id:  (s.mentor as any)?.user_id,
  }));

  const goals = (goalsRes.data || []).map((g: any) => ({
    id:        g.goal_id,
    title:     g.title,
    desc:      g.description || '',
    due:       g.target_date,
    status:    g.status,
    learner_id:g.learner_id,
    learner:   `${g.learners?.learner_profiles?.first_name ?? ''} ${g.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    school:    g.learners?.schools?.school_name ?? '',
    mentor:    (g.mentor as any)?.full_name ?? '—',
    mentor_id: (g.mentor as any)?.user_id,
    created:   g.created_at,
  }));

  const atRisk = (atRiskRes.data || []).map((r: any) => {
    const l = r.learners;
    const lastSession = (l.mentorship_sessions || [])
      .sort((a: any, b: any) => b.session_date.localeCompare(a.session_date))[0];
    const openInterv = (l.interventions || []).filter((i: any) => i.status !== 'resolved');
    const progTypes  = (l.program_enrollments || []).map((e: any) => e.programs?.program_type).filter(Boolean);
    return {
      learner_id:      l.learner_id,
      learner:         `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
      school:          l.schools?.school_name ?? '—',
      att:             Math.round(r.attendance_rate ?? 0),
      score:           Math.round(r.avg_score ?? 0),
      interests:       l.learner_profiles?.interests ?? [],
      aspiration:      l.learner_profiles?.aspiration ?? null,
      prog_types:      progTypes,
      sessions_count:  (l.mentorship_sessions || []).length,
      last_session:    lastSession?.session_date ?? null,
      open_interv:     openInterv.length,
      critical_interv: openInterv.some((i: any) => i.priority === 'critical' || i.priority === 'high'),
    };
  }).sort((a: any, b: any) => {
    // Critical+intervention first, then no sessions, then by score
    if (a.critical_interv && !b.critical_interv) return -1;
    if (!a.critical_interv && b.critical_interv) return 1;
    if (!a.last_session && b.last_session) return -1;
    if (a.last_session && !b.last_session) return 1;
    return a.score - b.score;
  });

  // Mentor stats (enriched)
  const mentorMap: Record<string, {
    name:string; sessions:number; learners:Set<string>;
    outcomes:string[]; moods:number[]; sessionTypes:Record<string,number>;
  }> = {};
  sessions.forEach(s => {
    if (!mentorMap[s.mentor_id]) mentorMap[s.mentor_id] = {
      name:s.mentor, sessions:0, learners:new Set(), outcomes:[], moods:[], sessionTypes:{},
    };
    const m = mentorMap[s.mentor_id];
    m.sessions++;
    m.learners.add(s.learner_id);
    if (s.outcome) m.outcomes.push(s.outcome);
    if (s.mood)    m.moods.push(s.mood);
    m.sessionTypes[s.type] = (m.sessionTypes[s.type] || 0) + 1;
  });
  const mentorStats = Object.entries(mentorMap).map(([id, m]) => ({
    id,
    name:         m.name,
    sessions:     m.sessions,
    learners:     m.learners.size,
    positiveRate: m.outcomes.length ? Math.round(m.outcomes.filter(o => o==='positive').length / m.outcomes.length * 100) : 0,
    avgMood:      m.moods.length ? Math.round(m.moods.reduce((s,v)=>s+v,0) / m.moods.length * 10) / 10 : null,
    topType:      Object.entries(m.sessionTypes).sort(([,a],[,b])=>b-a)[0]?.[0] ?? null,
  })).sort((a,b) => b.sessions - a.sessions);

  const now        = new Date().toISOString().slice(0,10);
  const monthAgo   = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
  const thisMonth  = sessions.filter(s => s.date >= monthAgo).length;
  const posOut     = sessions.filter(s => s.outcome === 'positive').length;
  const needsFollowUp = sessions.filter(s => s.outcome === 'needs_follow_up').length;
  const activeGoals   = goals.filter(g => g.status === 'active').length;
  const doneGoals     = goals.filter(g => g.status === 'completed').length;
  const overdueGoals  = goals.filter(g => g.status==='active' && g.due && g.due < now).length;

  // Avg mood trend
  const moods = sessions.filter(s=>s.mood).map(s=>s.mood as number);
  const avgMood = moods.length ? Math.round(moods.reduce((s,v)=>s+v,0)/moods.length*10)/10 : null;

  return {
    sessions, goals, atRisk, mentorStats,
    learners: (learnersRes.data || []).map((l: any) => ({
      learner_id:  l.learner_id,
      full_name:   `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
      interests:   l.learner_profiles?.interests ?? [],
      aspiration:  l.learner_profiles?.aspiration ?? null,
      school:      l.schools?.school_name ?? '',
      risk:        l.risk_scores?.risk_level ?? 'low',
      prog_types:  (l.program_enrollments || []).map((e: any) => e.programs?.program_type).filter(Boolean),
    })),
    mentors: mentorsRes.data || [],
    stats: { total:sessions.length, thisMonth, posOut, needsFollowUp, activeGoals, doneGoals, overdueGoals, avgMood },
  };
}

export default async function MentorshipPage() {
  const user = await requireAuth(['admin', 'instructor']);
  const data = await getPageData();

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-brand-700" />
            Mentorship
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.stats.total} sessions · {data.stats.thisMonth} this month
            {data.stats.overdueGoals > 0 && ` · `}
            {data.stats.overdueGoals > 0 && (
              <span className="text-amber-600 font-semibold">{data.stats.overdueGoals} overdue goal{data.stats.overdueGoals!==1?'s':''}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/mentorship/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Log Session
          </Link>
        </div>
      </div>
      <MentorshipClient {...data} currentUserId={user.user_id} />
    </div>
  );
}
