export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','sponsor']);
  if (denied) return denied;
  const { id } = await params;
  const { data, error } = await supabase
    .from('sponsor_learners')
    .select(`learner_id, enrolled_at, learners(learner_code, learner_profiles(first_name,last_name), schools(school_name), risk_scores(*))`)
    .eq('sponsor_id', id);
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;
  const { id } = await params;
  const { learner_id } = await req.json();
  if (!learner_id) return err('learner_id required');
  const { data, error } = await supabase
    .from('sponsor_learners')
    .insert({ sponsor_id: id, learner_id })
    .select().single();
  if (error) return err(error.message, 500);
  return created(data);
}