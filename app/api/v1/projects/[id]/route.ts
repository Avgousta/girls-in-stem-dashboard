export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

const updateSchema = z.object({
  project_name:      z.string().min(1).optional(),
  description:       z.string().optional(),
  completion_status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  stage:             z.enum(['planning','in_progress','review','submitted','marked']).optional(),
  score:             z.number().min(0).nullable().optional(),
  max_score:         z.number().min(1).optional(),
  due_date:          z.string().nullable().optional(),
  submitted_at:      z.string().nullable().optional(),
  file_url:          z.string().url().nullable().optional(),
});

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.completion_status === 'completed' && !updates.submitted_at) {
    updates.submitted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('project_id', (await params).id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor', 'learner']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('projects')
    .select(`*, learners(learner_profiles(*)), programs(program_name)`)
    .eq('project_id', (await params).id)
    .single();

  if (error) return err(error.message, 404);
  return ok(data);
}