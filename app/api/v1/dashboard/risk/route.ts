export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const level = req.nextUrl.searchParams.get('level') || 'high';

  const { data, error } = await supabase
    .from('risk_scores')
    .select(`
      score_id, attendance_rate, avg_score, risk_level, risk_flags, last_calculated,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name),
        program_enrollments(programs(program_name))
      )
    `)
    .eq('risk_level', level)
    .order('attendance_rate', { ascending: true })
    .limit(50);

  if (error) return err(error.message, 500);

  interface RiskRow { score_id:string; attendance_rate:number; avg_score:number; risk_level:string; risk_flags:string[]|null; last_calculated:string; learners:{learner_id:string;learner_code:string;learner_profiles:{first_name:string;last_name:string}|null;schools:{school_name:string}|null;program_enrollments:Array<{programs:{program_name:string}|null}>} }
  const shaped = ((data || []) as unknown as RiskRow[]).map(r => ({
    score_id:       r.score_id,
    learner_id:     r.learners.learner_id,
    learner_code:   r.learners.learner_code,
    attendance_rate:r.attendance_rate,
    avg_score:      r.avg_score,
    risk_level:     r.risk_level,
    risk_flags:     r.risk_flags,
    last_calculated:r.last_calculated,
    learner_name:   `${r.learners.learner_profiles?.first_name} ${r.learners.learner_profiles?.last_name}`,
    school_name:    r.learners.schools?.school_name,
    programme_name: r.learners.program_enrollments?.[0]?.programs?.program_name,
  }));

  return ok(shaped);
}