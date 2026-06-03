import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

const updateSchema = z.object({
  action_taken:   z.string().optional(),
  follow_up_date: z.string().optional(),
  status:         z.enum(['open', 'in_progress', 'resolved']).optional(),
});

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('interventions')
    .update(updates)
    .eq('intervention_id', (await params).id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('interventions')
    .select(`*, learners(learner_profiles(*)), users!flagged_by(full_name)`)
    .eq('intervention_id', (await params).id)
    .single();

  if (error) return err(error.message, 404);
  return ok(data);
}
