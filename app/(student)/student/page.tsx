import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import StudentDashboardClient, { type LearnerData, type Meeting } from './StudentDashboardClient';
import { calcTotalXP, levelFromTotalXP, calcStreak, buildChallenges } from '@/lib/gamification/engine';

function thisMonday(): string {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function StudentDashboard() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners')
    .select(`
      learner_id, learner_code, grade,
      learner_profiles(first_name, last_name, avatar_url, bio, aspiration, cover_color, interests),
      schools(school_name),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(status, programs(program_name, program_type)),
      attendance(status, session_date),
      assessments(percentage, grade_band, assessment_date, subject),
      projects(completion_status, stage, project_name, due_date),
      mentorship_sessions(session_id)
    `)
    .eq('user_id', user.user_id)
    .single();

  // Upcoming meetings
  const { data: learnerMeta } = await supabase
    .from('learners')
    .select('learner_id, program_enrollments(program_id)')
    .eq('user_id', user.user_id)
    .single();

  const programIds = ((learnerMeta as unknown as { program_enrollments: Array<{ program_id: string }> } | null)?.program_enrollments || []).map(e => e.program_id);

  const { data: meetings } = programIds.length ? await supabase
    .from('online_meetings')
    .select('meeting_id, title, scheduled_at, platform, meeting_url, programs(program_name)')
    .eq('is_cancelled', false)
    .in('program_id', programIds)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(2) : { data: [] };

  // Compute gamification via engine
  const typedLearner = learner as unknown as LearnerData | null;
  const attendance  = typedLearner?.attendance         || [];
  const assessments = typedLearner?.assessments        || [];
  const projects    = typedLearner?.projects           || [];
  const mentorship  = (typedLearner as unknown as { mentorship_sessions?: Array<{ session_id: string }> } | null)?.mentorship_sessions || [];
  const profile     = typedLearner?.learner_profiles;

  const streak      = calcStreak(attendance);
  const hasProfile  = !!(profile?.bio && profile?.aspiration);
  const totalXP     = calcTotalXP(attendance, assessments, projects, mentorship.length, hasProfile, streak.current);
  const levelData   = levelFromTotalXP(totalXP);
  const challenges  = buildChallenges(attendance, assessments, projects, streak.current);

  // Fetch this week's pulse (if already submitted)
  const learnerId = (learner as unknown as { learner_id: string } | null)?.learner_id ?? '';
  const { data: pulseRow } = learnerId
    ? await supabase
        .from('learner_pulse')
        .select('rating, barrier_flag, notes')
        .eq('learner_id', learnerId)
        .eq('week_date', thisMonday())
        .single()
    : { data: null };

  const typedPulse = pulseRow as { rating: number; barrier_flag: string | null; notes: string | null } | null;

  // Fetch learner's certificates
  const { data: certData } = learnerId
    ? await supabase
        .from('certificates')
        .select('certificate_id, cert_type, issued_at, verification_code, programs(program_name)')
        .eq('learner_id', learnerId)
        .order('issued_at', { ascending: false })
    : { data: [] };
  interface StudentCert { certificate_id: string; cert_type: string; issued_at: string; verification_code: string; programs: { program_name: string } | null }
  const certificates = (certData || []) as unknown as StudentCert[];

  return (
    <StudentDashboardClient
      learner={learner as unknown as LearnerData}
      meetings={(meetings || []) as unknown as Meeting[]}
      streak={streak}
      totalXP={totalXP}
      levelData={levelData}
      challenges={challenges.filter(c => !c.done).slice(0, 2)}
      pulse={{ learnerId, alreadySubmitted: !!typedPulse, existingRating: typedPulse?.rating ?? null }}
      certificates={certificates}
    />
  );
}
