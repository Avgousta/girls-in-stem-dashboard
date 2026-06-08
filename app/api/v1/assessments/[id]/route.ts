export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const body   = await req.json();
  // Only allow safe fields to be patched
  const allowed = ['score','max_score','grade_band','assessment_date','notes','feedback_strengths','feedback_improvements','feedback_actions','term','weighting','skill_tags'];
  const update  = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(update).length) return err('No valid fields to update');
  // Recompute grade_band from score if score is being updated
  if (update.score != null && update.max_score != null) {
    const pct = (Number(update.score) / Number(update.max_score)) * 100;
    update.grade_band = pct >= 80 ? 'Distinction' : pct >= 70 ? 'Merit' : pct >= 50 ? 'Pass' : 'Needs Support';
  }
  const { data, error } = await supabase.from('assessments').update(update).eq('assessment_id', id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { error } = await supabase.from('assessments').delete().eq('assessment_id', id);
  if (error) return err(error.message, 500);
  return ok({ deleted: id });
}

export async function GET(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor','learner']);
  if (denied) return denied;
  const { id } = await params;
  const { data, error } = await supabase.from('assessments').select(`
    *,
    learners!inner(learner_profiles(first_name,last_name)),
    programs(program_name),
    captured_user:users!captured_by(full_name)
  `).eq('assessment_id', id).single();
  if (error) return err(error.message, 500);
  return ok(data);
}