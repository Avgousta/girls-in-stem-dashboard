export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

const patchSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes:  z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('attendance')
    .update({ status: parsed.data.status, notes: parsed.data.notes ?? null })
    .eq('attendance_id', params.id)
    .select()
    .single();

  if (error) return err(error.message, 500);

  await supabase.rpc('calculate_risk_scores').then(() => {});

  return ok(data);
}
