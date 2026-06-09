export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
import { emailInterventionEscalated } from '@/lib/email';

const PRIORITY_ORDER = ['low', 'medium', 'high', 'critical'] as const;
type Priority = typeof PRIORITY_ORDER[number];

const schema = z.object({ reason: z.string().min(5) });

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { id } = await params;

  // Fetch current intervention + assigned user email
  const { data: intervention, error: fetchErr } = await supabase
    .from('interventions')
    .select(`
      intervention_id, priority, status,
      learners!inner(learner_profiles(first_name, last_name), schools(school_name)),
      assigned_user:users!assigned_to(user_id, full_name, email),
      flagged_user:users!flagged_by(user_id, full_name, email)
    `)
    .eq('intervention_id', id)
    .single();

  if (fetchErr || !intervention) return err('Intervention not found', 404);
  interface InterventionRow { intervention_id: string; priority: string; status: string; learners: { learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null } | null; assigned_user: { user_id: string; full_name: string; email: string } | null; flagged_user: { user_id: string; full_name: string; email: string } | null }
  const intv = intervention as unknown as InterventionRow;
  if (intv.status === 'resolved') return err('Cannot escalate a resolved intervention');

  const currentPriority = intv.priority as Priority;
  const currentIdx      = PRIORITY_ORDER.indexOf(currentPriority);
  if (currentIdx >= PRIORITY_ORDER.length - 1) return err('Already at maximum priority (critical)');

  const newPriority = PRIORITY_ORDER[currentIdx + 1];
  const escalatedBy = profile!.full_name;
  const reason      = parsed.data.reason;

  // Bump priority + log update in parallel
  const [patchResult, updateResult] = await Promise.all([
    supabase.from('interventions')
      .update({ priority: newPriority })
      .eq('intervention_id', id)
      .select()
      .single(),
    supabase.from('intervention_updates').insert({
      intervention_id: id,
      author_id:       profile!.user_id,
      note:            `ESCALATION: ${reason}`,
      status_change:   `${currentPriority} → ${newPriority} (escalated by ${escalatedBy})`,
    }).select().single(),
  ]);

  if (patchResult.error)  return err(patchResult.error.message, 500);
  if (updateResult.error) return err(updateResult.error.message, 500);

  // Fire notifications (non-blocking)
  const assignee   = intv.assigned_user;
  const learner    = intv.learners;
  const learnerName = `${learner?.learner_profiles?.first_name ?? ''} ${learner?.learner_profiles?.last_name ?? ''}`.trim();
  const school      = learner?.schools?.school_name ?? '';

  if (assignee?.email && assignee.user_id !== profile!.user_id) {
    emailInterventionEscalated({
      assigneeEmail:  assignee.email,
      assigneeName:   assignee.full_name,
      assigneeUserId: assignee.user_id,
      learnerName, school,
      oldPriority: currentPriority,
      newPriority,
      reason,
      escalatedBy,
      interventionId: id,
    }).catch(console.error);
  }

  return ok({ priority: newPriority, update: updateResult.data });
}