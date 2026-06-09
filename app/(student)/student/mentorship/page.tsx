import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LearnerSessionSummary, LearnerGoalCard } from '@/components/mentorship/MentorshipBadges';

const t = {
  text:   'var(--t-text)',
  muted:  'var(--t-muted)',
  card:   'var(--t-card)',
  border: '1px solid var(--t-border)',
};

export default async function StudentMentorshipPage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learnerRow } = await supabase
    .from('learners').select('learner_id').eq('user_id', user.user_id).single();
  const learnerId = (learnerRow as { learner_id: string } | null)?.learner_id;

  if (!learnerId) return (
    <div className="text-center py-16">
      <p className="font-semibold" style={{ color: t.muted }}>Learner profile not linked.</p>
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

  interface SessionRow { session_id: string; session_date: string; session_type: string | null; duration_minutes: number | null; notes: string | null; next_steps: string | null; goals_discussed: string | null; learner_mood: number | null; outcome: string | null; users: { full_name: string } | null }
  interface GoalRow    { goal_id: string; title: string; description: string | null; target_date: string | null; status: string; created_at: string; users: { full_name: string } | null }
  const sessions       = (sessionsRes.data  || []) as unknown as SessionRow[];
  const goals          = (goalsRes.data     || []) as unknown as GoalRow[];
  const activeGoals    = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const latestNextStep = sessions.find(s => s.next_steps);

  return (
    <div className="space-y-6 pt-1">
      <div>
        <h1 className="text-2xl font-black" style={{ color: t.text }}>My Mentorship 💬</h1>
        <p className="text-sm mt-0.5" style={{ color: t.muted }}>
          {sessions.length} session{sessions.length!==1?'s':''} · {activeGoals.length} active goal{activeGoals.length!==1?'s':''}
        </p>
      </div>

      {sessions.length === 0 && goals.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: t.card, border: t.border }}>
          <p className="text-4xl mb-3">💬</p>
          <p className="font-semibold" style={{ color: t.muted }}>No mentorship sessions yet</p>
          <p className="text-sm mt-1" style={{ color: t.muted }}>Your mentor sessions and goals will appear here</p>
        </div>
      )}

      {/* Latest next steps callout */}
      {latestNextStep && (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.25)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#60A5FA' }}>
            📌 Your Next Steps
          </p>
          <p className="text-sm leading-relaxed" style={{ color: t.text }}>{latestNextStep.next_steps}</p>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: t.muted }}>
            🎯 My Goals
          </p>
          <div className="space-y-2">
            {activeGoals.map(g => (
              <LearnerGoalCard key={g.goal_id} title={g.title} desc={g.description||''} due={g.target_date} status={g.status} />
            ))}
          </div>
        </div>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: t.muted }}>
            Session History
          </p>
          <div className="space-y-3">
            {sessions.map(s => (
              <LearnerSessionSummary
                key={s.session_id}
                type={s.session_type || 'check_in'}
                date={s.session_date}
                mentorName={s.users?.full_name || '—'}
                outcome={s.outcome}
                mood={s.learner_mood}
                nextSteps={s.next_steps || ''}
              />
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="opacity-70">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: t.muted }}>
            ✅ Completed Goals ({completedGoals.length})
          </p>
          <div className="space-y-2">
            {completedGoals.map(g => (
              <LearnerGoalCard key={g.goal_id} title={g.title} desc={g.description||''} due={g.target_date} status={g.status} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
