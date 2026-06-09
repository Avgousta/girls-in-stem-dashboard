import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import StudentDashboardClient, { type LearnerData, type Meeting } from './StudentDashboardClient';
import { calcTotalXP, levelFromTotalXP, calcStreak, buildChallenges } from '@/lib/gamification/engine';

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

  const programIds = ((learnerMeta as any)?.program_enrollments || []).map((e: any) => e.program_id);

  const { data: meetings } = programIds.length ? await supabase
    .from('online_meetings')
    .select('meeting_id, title, scheduled_at, platform, meeting_url, programs(program_name)')
    .eq('is_cancelled', false)
    .in('program_id', programIds)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(2) : { data: [] };

  // Compute gamification via engine
  const attendance  = (learner as any)?.attendance         || [];
  const assessments = (learner as any)?.assessments        || [];
  const projects    = (learner as any)?.projects           || [];
  const mentorship  = (learner as any)?.mentorship_sessions|| [];
  const profile     = (learner as any)?.learner_profiles;

  const streak      = calcStreak(attendance);
  const hasProfile  = !!(profile?.bio && profile?.aspiration);
  const totalXP     = calcTotalXP(attendance, assessments, projects, mentorship.length, hasProfile, streak.current);
  const levelData   = levelFromTotalXP(totalXP);
  const challenges  = buildChallenges(attendance, assessments, projects, streak.current);

  return (
    <StudentDashboardClient
      learner={learner as unknown as LearnerData}
      meetings={(meetings || []) as unknown as Meeting[]}
      streak={streak}
      totalXP={totalXP}
      levelData={levelData}
      challenges={challenges.filter(c => !c.done).slice(0, 2)} // top 2 active challenges
    />
  );
}
