import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ProgressClient from './ProgressClient';

export default async function StudentProgressPage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners')
    .select(`
      attendance(status, session_date, programs(program_name)),
      assessments(
        assessment_id, subject, assessment_type, difficulty, skill_tags,
        score, max_score, percentage, grade_band, assessment_date, term,
        notes, feedback_strengths, feedback_improvements, feedback_actions,
        programs(program_name)
      )
    `)
    .eq('user_id', user.user_id)
    .single();

  interface ProgressLearner {
    assessments: Array<{ assessment_id: string; subject: string; assessment_type: string; difficulty: string | null; skill_tags: string[] | null; score: number | null; max_score: number | null; percentage: number | null; grade_band: string | null; assessment_date: string | null; term: number | null; notes: string | null; feedback_strengths: string | null; feedback_improvements: string | null; feedback_actions: string | null; programs: { program_name: string } | null }>;
    attendance: Array<{ status: string; session_date: string; programs: { program_name: string } | null }>;
  }
  const typed      = learner as unknown as ProgressLearner | null;
  const assessments = [...(typed?.assessments || [])]
    .sort((a, b) => (a.assessment_date||'').localeCompare(b.assessment_date||''));
  const attendance  = typed?.attendance || [];

  return <ProgressClient assessments={assessments} attendance={attendance} />;
}
