import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LearnerSessionSummary, LearnerGoalCard } from '@/components/mentorship/MentorshipBadges';

export default async function StudentMentorshipPage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learnerRow } = await supabase
    .from('learners').select('learner_id').eq('user_id', user.user_id).single();
  const learnerId = (learnerRow as any)?.learner_id;

  if (!learnerId) return (
    <div className="text-center py-16">
      <p className="text-white/50 font-semibold">Learner profile not linked.</p>
    </div>
  );

  const [sessionsRes, goalsRes] = await Promise.all([
    supabase.from('mentorship_sessions')
      .select('session_id, session_date, session_type, duration_minutes, notes, next_steps, goals_discussed, learner_mood, outcome, users!mentor_id(full_name)')
      .eq('learner_id', learnerId)
      .order('session_date', { ascending: false })
      .limit(20),
    supabase.from('mentorship_goals')
      .select('goal_id, title, description, target_date, status, created_at, users!mentor_id(full_name)')
      .eq('learner_id', learnerId)
      .order('created_at', { ascending: false }),
  ]);

  const sessions       = sessionsRes.data  || [];
  const goals          = goalsRes.data     || [];
  const activeGoals    = goals.filter((g: any) => g.status === 'active');
  const completedGoals = goals.filter((g: any) => g.status === 'completed');
  const latestNextStep = sessions.find((s: any) => s.next_steps);

  return (
    <div className="space-y-6 pt-1">
      <div>
        <h1 className="text-2xl font-black text-white">My Mentorship 💬</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {sessions.length} session{sessions.length!==1?'s':''} · {activeGoals.length} active goal{activeGoals.length!==1?'s':''}
        </p>
      </div>

      {sessions.length === 0 && goals.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-4xl mb-3">💬</p>
          <p className="text-white/60 font-semibold">No mentorship sessions yet</p>
          <p className="text-sm text-white/30 mt-1">Your mentor sessions and goals will appear here</p>
        </div>
      )}

      {/* Latest next steps callout */}
      {latestNextStep && (
        <div className="rounded-2xl p-4"
          style={{ background:'rgba(29,78,216,0.12)', border:'1px solid rgba(29,78,216,0.3)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">📌 Your Next Steps</p>
          <p className="text-sm text-white/80 leading-relaxed">{(latestNextStep as any).next_steps}</p>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">🎯 My Goals</p>
          <div className="space-y-2">
            {activeGoals.map((g: any) => (
              <LearnerGoalCard key={g.goal_id} title={g.title} desc={g.description||''} due={g.target_date} status={g.status} />
            ))}
          </div>
        </div>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Session History</p>
          <div className="space-y-3">
            {sessions.map((s: any) => (
              <LearnerSessionSummary
                key={s.session_id}
                type={s.session_type || 'check_in'}
                date={s.session_date}
                mentorName={(s.users as any)?.full_name || '—'}
                outcome={s.outcome}
                mood={s.learner_mood}
                nextSteps={s.next_steps || ''}
              />
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="opacity-60">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">✅ Completed Goals ({completedGoals.length})</p>
          <div className="space-y-2">
            {completedGoals.map((g: any) => (
              <LearnerGoalCard key={g.goal_id} title={g.title} desc={g.description||''} due={g.target_date} status={g.status} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
