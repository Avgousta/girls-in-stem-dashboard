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

  const assessments = ((learner as any)?.assessments || [])
    .sort((a: any, b: any) => (a.assessment_date||'').localeCompare(b.assessment_date||''));
  const attendance  = (learner as any)?.attendance || [];

  return <ProgressClient assessments={assessments} attendance={attendance} />;
}
