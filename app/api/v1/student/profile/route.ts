export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

export async function GET(_: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['learner']);
  if (denied) return denied;

  const { data: learner } = await supabase
    .from('learners')
    .select('learner_id, learner_profiles(*)')
    .eq('user_id', profile!.user_id)
    .single();

  if (!learner) return err('Profile not found', 404);
  return ok((learner as unknown as { learner_profiles: unknown }).learner_profiles);
}

export async function PATCH(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['learner']);
  if (denied) return denied;

  const { data: learner } = await supabase
    .from('learners').select('learner_id').eq('user_id', profile!.user_id).single();
  if (!learner) return err('Learner not found', 404);

  const body = await req.json();
  const allowed = ['bio', 'interests', 'hobbies', 'aspiration', 'avatar_url', 'cover_color', 'phone'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('learner_profiles')
    .update(updates)
    .eq('learner_id', (learner as unknown as { learner_id: string }).learner_id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}