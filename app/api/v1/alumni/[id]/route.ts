export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

const updateSchema = z.object({
  graduated_at:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  final_status:         z.enum(['completed', 'withdrawn', 'transferred']).optional(),
  higher_ed_enrolled:   z.boolean().optional().nullable(),
  institution:          z.string().optional().nullable(),
  career_field:         z.string().optional().nullable(),
  employed_in_stem:     z.boolean().optional().nullable(),
  consent_for_followup: z.boolean().optional(),
  notes:                z.string().optional().nullable(),
});

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('alumni')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('alumni_id', (await params).id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}
