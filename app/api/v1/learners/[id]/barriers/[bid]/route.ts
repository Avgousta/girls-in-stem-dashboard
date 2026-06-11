export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string; bid: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { bid } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.active !== undefined) updates.active = body.active;
  if (body.notes  !== undefined) updates.notes  = body.notes;
  if (body.active === false) updates.resolved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('learner_barriers')
    .update(updates)
    .eq('barrier_id', bid)
    .select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}
