export const dynamic = 'force-dynamic';

import { requireApiAuth, ok, err } from '@/app/api/helpers';

export async function GET() {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const [
    learnersRes,
    programsRes,
    attRes,
    scoreRes,
    riskRes,
    schoolsRes,
    interventionsRes,
    completionsRes,
  ] = await Promise.all([
    supabase.from('learners').select('*', { count: 'exact', head: true }).eq('programme_status', 'active'),
    supabase.from('programs').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('attendance').select('status'),
    supabase.from('assessments').select('percentage'),
    supabase.from('risk_scores').select('*', { count: 'exact', head: true }).eq('risk_level', 'high'),
    supabase.from('schools').select('school_id').eq('is_active', true),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
    supabase.from('program_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completion_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
  ]);

  // Calculate average attendance rate
  const allAtt      = attRes.data || [];
  const avgAtt      = allAtt.length
    ? Math.round(allAtt.filter((a: { status: string }) => a.status === 'present').length / allAtt.length * 100)
    : 0;

  // Calculate average score
  const allScores   = (scoreRes.data || []).map((a: { percentage: number | null }) => Number(a.percentage));
  const avgScore    = allScores.length
    ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
    : 0;

  return ok({
    total_learners:        learnersRes.count    || 0,
    active_programs:       programsRes.count    || 0,
    avg_attendance_rate:   avgAtt,
    avg_score:             avgScore,
    high_risk_learners:    riskRes.count         || 0,
    schools_participating: schoolsRes.data?.length || 0,
    open_interventions:    interventionsRes.count || 0,
    completions_this_month:completionsRes.count  || 0,
  });
}