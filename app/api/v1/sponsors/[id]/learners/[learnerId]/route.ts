export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
interface Params { params: Promise<{ id: string; learnerId: string }> }

export async function DELETE(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;
  const { id, learnerId } = await params;
  const { error } = await supabase
    .from('sponsor_learners')
    .delete()
    .eq('sponsor_id', id)
    .eq('learner_id', learnerId);
  if (error) return err(error.message, 500);
  return ok({ deleted: true });
}