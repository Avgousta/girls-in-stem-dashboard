export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status:     z.enum(['suggested', 'active', 'paused', 'ended']).optional(),
  notes:      z.string().optional(),
  started_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ended_at:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  // Auto-set ended_at when status → ended
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === 'ended' && !parsed.data.ended_at) {
    update.ended_at = new Date().toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from('peer_support_pairs')
    .update(update)
    .eq('pair_id', (await params).id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const { error } = await supabase
    .from('peer_support_pairs')
    .delete()
    .eq('pair_id', (await params).id);

  if (error) return err(error.message, 500);
  return ok({ deleted: true });
}
