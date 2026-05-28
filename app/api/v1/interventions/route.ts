import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

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
  return created(data);
}
