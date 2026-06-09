export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor', 'learner', 'parent']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('learners')
    .select(`
      *,
      learner_profiles(*),
      schools(*),
      risk_scores(*),
      program_enrollments(*, programs(*)),
      attendance(attendance_id, status, session_date, programs(program_name)),
      assessments(*, programs(program_name)),
      mentorship_sessions(*, users!mentor_id(full_name)),
      interventions(*)
    `)
    .eq('learner_id', (await params).id)
    .single();

  if (error) return err(error.message, 404);
  return ok(data);
}

const updateSchema = z.object({
  grade:            z.number().int().min(8).max(12).optional(),
  programme_status: z.enum(['active', 'inactive', 'graduated', 'withdrawn']).optional(),
  first_name:       z.string().optional(),
  last_name:        z.string().optional(),
  email:            z.string().email().optional(),
  phone:            z.string().optional(),
  parent_name:      z.string().optional(),
  parent_contact:   z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { first_name, last_name, email, phone, parent_name, parent_contact, ...learnerFields } = parsed.data;

  // Update learner
  if (Object.keys(learnerFields).length) {
    const { error } = await supabase.from('learners').update(learnerFields).eq('learner_id', (await params).id);
    if (error) return err(error.message, 500);
  }

  // Update profile
  const profileFields = { first_name, last_name, email, phone, parent_name, parent_contact };
  const nonNull = Object.fromEntries(Object.entries(profileFields).filter(([, v]) => v !== undefined));
  if (Object.keys(nonNull).length) {
    await supabase.from('learner_profiles').update(nonNull).eq('learner_id', (await params).id);
  }

  const { data } = await supabase.from('learners').select('*, learner_profiles(*)').eq('learner_id', (await params).id).single();
  return ok(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const id        = (await params).id;
  const permanent = req.nextUrl.searchParams.get('permanent') === 'true';

  if (permanent) {
    // Hard delete — remove all related data then the learner record
    await supabase.from('assessments')        .delete().eq('learner_id', id);
    await supabase.from('attendance')         .delete().eq('learner_id', id);
    await supabase.from('program_enrollments').delete().eq('learner_id', id);
    await supabase.from('risk_scores')        .delete().eq('learner_id', id);
    await supabase.from('interventions')      .delete().eq('learner_id', id);
    await supabase.from('mentorship_sessions').delete().eq('learner_id', id);
    await supabase.from('notifications')      .delete().eq('learner_id', id);
    await supabase.from('sponsor_learners')   .delete().eq('learner_id', id);
    await supabase.from('learner_profiles')   .delete().eq('learner_id', id);
    const { error } = await supabase.from('learners').delete().eq('learner_id', id);
    if (error) return err(error.message, 500);
    return ok({ deleted: true, permanent: true });
  }

  // Soft delete — mark as withdrawn, keep all data
  const { error } = await supabase
    .from('learners')
    .update({ programme_status: 'withdrawn' })
    .eq('learner_id', id);

  if (error) return err(error.message, 500);
  return ok({ deleted: true, permanent: false });
}