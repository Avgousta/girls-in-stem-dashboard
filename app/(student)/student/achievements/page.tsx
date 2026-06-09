import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AchievementsClient from './AchievementsClient';
import { calcTotalXP, levelFromTotalXP, calcStreak, buildChallenges } from '@/lib/gamification/engine';

export default async function StudentAchievementsPage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners')
    .select(`
      attendance(status, session_date),
      assessments(percentage, grade_band, subject),
      projects(completion_status, stage),
      mentorship_sessions(session_id),
      learner_profiles(bio, aspiration)
    `)
    .eq('user_id', user.user_id)
    .single();

  interface AchievLearner {
    attendance: Array<{ status: string; session_date: string }>;
    assessments: Array<{ percentage: number | string | null; grade_band: string | null; subject: string }>;
    projects: Array<{ completion_status: string; stage: string | null }>;
    mentorship_sessions: Array<{ session_id: string }>;
    learner_profiles: { bio: string | null; aspiration: string | null } | null;
  }
  const l           = learner as unknown as AchievLearner | null;
  const attendance  = l?.attendance           || [];
  const assessments = l?.assessments          || [];
  const projects    = l?.projects             || [];
  const mentorship  = l?.mentorship_sessions  || [];
  const profile     = l?.learner_profiles;

  const streak       = calcStreak(attendance);
  const hasProfile   = !!(profile?.bio && profile?.aspiration);
  const totalXP      = calcTotalXP(attendance, assessments, projects, mentorship.length, hasProfile, streak.current);
  const levelData    = levelFromTotalXP(totalXP);
  const challenges   = buildChallenges(attendance, assessments, projects, streak.current);

  const attRate      = attendance.length ? Math.round(attendance.filter(a => a.status === 'present').length / attendance.length * 100) : 0;
  const avgScore     = assessments.length ? Math.round(assessments.reduce((s, a) => s + Number(a.percentage || 0), 0) / assessments.length) : 0;
  const doneProj     = projects.filter(p => ['marked','completed'].includes(p.stage || p.completion_status || '')).length;
  const distinctions = assessments.filter(a => a.grade_band === 'Distinction').length;

  return (
    <AchievementsClient
      stats={{ attRate, avgScore, doneProj, distinctions,
        presStreak: attendance.filter(a => a.status === 'present').length,
        totalAss: assessments.length, mentorship: mentorship.length }}
      streak={streak}
      totalXP={totalXP}
      levelData={levelData}
      challenges={challenges}
    />
  );
}
