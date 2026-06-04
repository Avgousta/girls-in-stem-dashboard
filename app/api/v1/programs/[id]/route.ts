export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('programs')
    .select(`
      *,
      users!instructor_id(full_name, email),
      schools(school_name, district, province),
      program_enrollments(
        enrollment_id, status, enrolled_at,
        learners(learner_id, learner_code, grade, learner_profiles(first_name, last_name), risk_scores(*))
      )
    `)
    .eq('program_id', (await params).id)
    .single();

  if (error) return err(error.message, 404);
  return ok(data);
}

const updateSchema = z.object({
  program_name:  z.string().min(1).optional(),
  program_type:  z.string().optional(),
  end_date:      z.string().optional(),
  is_active:     z.boolean().optional(),
  max_capacity:  z.number().int().min(1).optional(),
  description:   z.string().optional(),
  instructor_id: z.string().uuid().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('programs')
    .update(parsed.data)
    .eq('program_id', (await params).id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const id = (await params).id;

  // Soft delete — set is_active to false rather than destroying data
  const { error } = await supabase
    .from('programs')
    .update({ is_active: false })
    .eq('program_id', id);

  if (error) return err(error.message, 500);
  return ok({ deleted: true, program_id: id });
}