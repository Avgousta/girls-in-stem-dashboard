export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';
import { emailInterventionAssigned } from '@/lib/email';

const createSchema = z.object({
  learner_id:        z.string().uuid(),
  flagged_by:        z.string().uuid(),
  intervention_type: z.enum(['academic','attendance','behavioural','personal','technical','other']).default('academic'),
  priority:          z.enum(['low','medium','high','critical']).default('medium'),
  reason:            z.string().min(5),
  action_plan:       z.string().optional(),
  action_taken:      z.string().optional(),
  assigned_to:       z.string().uuid().optional(),
  follow_up_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:            z.enum(['open','in_progress','resolved']).default('open'),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const { from, to, page, limit } = getPagination(sp);
  const learnerId = sp.get('learner_id');
  const status    = sp.get('status');
  let q = supabase.from('interventions')
    .select(`intervention_id, intervention_type, priority, reason, status, created_at,
      learners!inner(learner_profiles(first_name,last_name)),
      users!flagged_by(full_name)`, { count:'exact' })
    .range(from, to).order('created_at', { ascending:false });
  if (learnerId) q = q.eq('learner_id', learnerId);
  if (status)    q = q.eq('status', status);
  const { data, count, error } = await q;
  if (error) return err(error.message, 500);
  return paginatedResponse(data || [], count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const { data, error } = await supabase
    .from('interventions').insert(parsed.data).select().single();
  if (error) return err(error.message, 500);

  // Snapshot current risk score as "before" baseline for outcome tracking
  const interventionId = (data as { intervention_id: string }).intervention_id;
  Promise.resolve(
    supabase.from('risk_scores')
      .select('risk_level, avg_score, attendance_rate')
      .eq('learner_id', parsed.data.learner_id)
      .single()
  ).then(({ data: rs }) => {
    if (!rs) return;
    const r = rs as { risk_level: string; avg_score: number; attendance_rate: number };
    return Promise.resolve(
      supabase.from('intervention_outcomes').insert({
        intervention_id: interventionId,
        risk_before:  r.risk_level,
        score_before: r.avg_score,
        att_before:   r.attendance_rate,
      })
    );
  }).catch(() => {});

  // Email assignee if one was specified
  if (parsed.data.assigned_to) {
    const [{ data: assignee }, { data: learnerRow }] = await Promise.all([
      supabase.from('users').select('email, full_name, user_id').eq('user_id', parsed.data.assigned_to).single(),
      supabase.from('learners')
        .select('learner_profiles(first_name,last_name), schools(school_name)')
        .eq('learner_id', parsed.data.learner_id).single(),
    ]);
    if (assignee?.email) {
      const typedLearner = learnerRow as unknown as { learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null } | null;
      emailInterventionAssigned({
        assigneeEmail:  assignee.email,
        assigneeName:   assignee.full_name,
        assigneeUserId: assignee.user_id,
        learnerName:    `${typedLearner?.learner_profiles?.first_name ?? ''} ${typedLearner?.learner_profiles?.last_name ?? ''}`.trim(),
        school:         typedLearner?.schools?.school_name ?? 'Unknown',
        priority:       parsed.data.priority,
        type:           parsed.data.intervention_type,
        reason:         parsed.data.reason,
        interventionId: (data as { intervention_id: string }).intervention_id,
      }).catch(() => {});
    }
  }

  return created(data);
}