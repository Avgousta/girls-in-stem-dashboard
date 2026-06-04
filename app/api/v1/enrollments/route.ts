export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const schema = z.object({
  learner_id: z.string().uuid(),
  program_id: z.string().uuid(),
});

// POST — enroll a learner in a programme
export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  // Upsert — if already exists (even inactive), reactivate
  const { data, error } = await supabase
    .from('program_enrollments')
    .upsert({
      learner_id: parsed.data.learner_id,
      program_id: parsed.data.program_id,
      status:     'active',
    }, { onConflict: 'learner_id,program_id' })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}

// DELETE — unenroll (soft — sets status to inactive)
export async function DELETE(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { error } = await supabase
    .from('program_enrollments')
    .update({ status: 'inactive' })
    .eq('learner_id', parsed.data.learner_id)
    .eq('program_id', parsed.data.program_id);

  if (error) return err(error.message, 500);
  return ok({ unenrolled: true });
}