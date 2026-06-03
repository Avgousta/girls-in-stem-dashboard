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

  const attendance  = (learner as any)?.attendance           || [];
  const assessments = (learner as any)?.assessments          || [];
  const projects    = (learner as any)?.projects             || [];
  const mentorship  = (learner as any)?.mentorship_sessions  || [];
  const profile     = (learner as any)?.learner_profiles;

  const streak       = calcStreak(attendance);
  const hasProfile   = !!(profile?.bio && profile?.aspiration);
  const totalXP      = calcTotalXP(attendance, assessments, projects, mentorship.length, hasProfile, streak.current);
  const levelData    = levelFromTotalXP(totalXP);
  const challenges   = buildChallenges(attendance, assessments, projects, streak.current);

  const attRate      = attendance.length ? Math.round(attendance.filter((a: any) => a.status === 'present').length / attendance.length * 100) : 0;
  const avgScore     = assessments.length ? Math.round(assessments.reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / assessments.length) : 0;
  const doneProj     = projects.filter((p: any) => ['marked','completed'].includes(p.stage || p.completion_status || '')).length;
  const distinctions = assessments.filter((a: any) => a.grade_band === 'Distinction').length;

  return (
    <AchievementsClient
      stats={{ attRate, avgScore, doneProj, distinctions,
        presStreak: attendance.filter((a: any) => a.status === 'present').length,
        totalAss: assessments.length, mentorship: mentorship.length }}
      streak={streak}
      totalXP={totalXP}
      levelData={levelData}
      challenges={challenges}
    />
  );
}
