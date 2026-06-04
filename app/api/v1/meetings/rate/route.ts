export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['learner']);
  if (denied) return denied;

  const { meeting_id, rating, comment } = await req.json();
  if (!meeting_id || !rating) return err('meeting_id and rating required');
  if (rating < 1 || rating > 5) return err('Rating must be 1-5');

  const { data: learner } = await supabase
    .from('learners').select('learner_id').eq('user_id', profile!.user_id).single();
  if (!learner) return err('Learner not found', 404);

  const { data, error } = await supabase
    .from('meeting_ratings')
    .upsert({
      meeting_id,
      learner_id: (learner as any).learner_id,
      rating,
      comment: comment || null,
    }, { onConflict: 'meeting_id,learner_id' })
    .select().single();

  if (error) return err(error.message, 500);
  return created(data);
}