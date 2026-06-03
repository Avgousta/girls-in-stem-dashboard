import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const body   = await req.json();
  // Only allow safe fields to be patched
  const allowed = ['notes','feedback_strengths','feedback_improvements','feedback_actions','grade_band','term','weighting','skill_tags'];
  const update  = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(update).length) return err('No valid fields to update');
  const { data, error } = await supabase.from('assessments').update(update).eq('assessment_id', id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
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
