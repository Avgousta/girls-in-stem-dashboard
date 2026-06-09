export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

const createSchema = z.object({
  learner_id:           z.string().uuid(),
  program_id:           z.string().uuid(),
  subject:              z.string().min(1),
  score:                z.number().min(0),
  max_score:            z.number().min(1).default(100),
  assessment_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  captured_by:          z.string().uuid().optional(),
  assessment_type:      z.enum(['quiz','test','project','practical','assignment','oral','other']).default('test'),
  difficulty:           z.enum(['easy','medium','hard','advanced']).default('medium'),
  skill_tags:           z.array(z.string()).optional(),
  notes:                z.string().optional(),
  feedback_strengths:   z.string().optional(),
  feedback_improvements:z.string().optional(),
  feedback_actions:     z.string().optional(),
  term:                 z.number().int().min(1).max(4).optional(),
  weighting:            z.number().min(0.1).max(10).default(1.0),
  grade_band:           z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor','learner','parent']);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const { page, limit, from, to } = getPagination(sp);
  let q = supabase.from('assessments').select(`
    assessment_id, subject, assessment_type, difficulty, skill_tags, term, weighting,
    score, max_score, percentage, grade_band, assessment_date, notes, created_at,
    learners!inner(learner_profiles(first_name,last_name)),
    programs(program_name)
  `, { count:'exact' }).range(from, to).order('assessment_date', { ascending:false });

  const programId = sp.get('program_id');
  const learnerId = sp.get('learner_id');
  if (programId) q = q.eq('program_id', programId);
  if (learnerId) q = q.eq('learner_id', learnerId);

  const { data, count, error } = await q;
  if (error) return err(error.message, 500);
  return paginatedResponse(data || [], count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase.from('assessments').insert(parsed.data).select().single();
  if (error) return err(error.message, 500);

  // Refresh risk scores
  try { await supabase.rpc('calculate_risk_scores'); } catch (_) {}

  // Auto-trigger intervention if score < 40%
  if (parsed.data.score != null && parsed.data.max_score) {
    const pct = Math.round((parsed.data.score / parsed.data.max_score) * 100);
    if (pct < 40) {
      try {
        await supabase.from('interventions').insert({
          learner_id:        parsed.data.learner_id,
          flagged_by:        parsed.data.captured_by ?? null,
          intervention_type: 'academic',
          priority:          pct < 25 ? 'high' : 'medium',
          reason:            `Auto-flagged: scored ${pct}% on ${parsed.data.subject} (${parsed.data.assessment_type}).`,
          status:            'open',
        });
      } catch (_) {}
    }
  }

  // Notify learner
  const { data: learner } = await supabase
    .from('learners').select('user_id').eq('learner_id', parsed.data.learner_id).single();
  const typedLearner = learner as { user_id: string } | null;
  if (typedLearner?.user_id) {
    const pct = parsed.data.score != null && parsed.data.max_score
      ? Math.round((parsed.data.score / parsed.data.max_score) * 100) : null;
    try {
      await supabase.from('notifications').insert({
        user_id:    typedLearner.user_id,
        learner_id: parsed.data.learner_id,
        type:       'assessment',
        title:      `Result: ${parsed.data.subject}`,
        body:       pct != null ? `You scored ${pct}% — ${parsed.data.grade_band || ''}.` : 'New assessment recorded.',
      });
    } catch (_) {}
  }

  return created(data);
}