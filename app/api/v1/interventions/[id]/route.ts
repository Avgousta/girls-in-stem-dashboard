export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

const updateSchema = z.object({
  action_taken:      z.string().optional(),
  follow_up_date:    z.string().optional(),
  status:            z.enum(['open', 'in_progress', 'resolved']).optional(),
  assigned_to:       z.string().uuid().optional(),
  priority:          z.enum(['low', 'medium', 'high', 'critical']).optional(),
  effectiveness:     z.number().int().min(1).max(5).optional(),
  resolution_notes:  z.string().optional(),
});

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const interventionId = (await params).id;
  const { effectiveness, resolution_notes, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };

  if (parsed.data.status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('interventions')
    .update(updates)
    .eq('intervention_id', interventionId)
    .select('learner_id')
    .single();

  if (error) return err(error.message, 500);

  // On resolve: snapshot current risk as "after" and record effectiveness
  if (parsed.data.status === 'resolved') {
    const learnerId = (data as { learner_id: string }).learner_id;
    Promise.resolve(
      supabase.from('risk_scores')
        .select('risk_level, avg_score, attendance_rate')
        .eq('learner_id', learnerId)
        .single()
    ).then(({ data: rs }) => {
      const r = (rs ?? {}) as { risk_level?: string; avg_score?: number; attendance_rate?: number };
      return Promise.resolve(
        supabase.from('intervention_outcomes').upsert({
          intervention_id: interventionId,
          risk_after:  r.risk_level       ?? null,
          score_after: r.avg_score        ?? null,
          att_after:   r.attendance_rate  ?? null,
          ...(effectiveness    != null ? { effectiveness }              : {}),
          ...(resolution_notes != null ? { notes: resolution_notes }   : {}),
        }, { onConflict: 'intervention_id' })
      );
    }).catch(() => {});
  } else if (effectiveness != null || resolution_notes != null) {
    Promise.resolve(
      supabase.from('intervention_outcomes').upsert({
        intervention_id: interventionId,
        ...(effectiveness    != null ? { effectiveness }            : {}),
        ...(resolution_notes != null ? { notes: resolution_notes } : {}),
      }, { onConflict: 'intervention_id' })
    ).catch(() => {});
  }

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