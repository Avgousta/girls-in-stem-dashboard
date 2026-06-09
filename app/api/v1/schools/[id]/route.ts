export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

const patchSchema = z.object({
  school_name:    z.string().min(2).optional(),
  district:       z.string().min(1).optional(),
  province:       z.string().optional(),
  contact_person: z.string().optional().nullable(),
  contact_email:  z.string().email().optional().nullable(),
  contact_phone:  z.string().optional().nullable(),
  is_active:      z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const { id }   = await params;
  const body     = await req.json();
  const parsed   = patchSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const update = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );
  if (!Object.keys(update).length) return err('No valid fields to update');

  const { data, error } = await supabase
    .from('schools').update(update).eq('school_id', id).select().single();

  if (error) return err(error.message, 500);
  return ok(data);
}
