export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

const singleSchema = z.object({
  learner_id:   z.string().uuid(),
  program_id:   z.string().uuid(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:       z.enum(['present', 'absent', 'late', 'excused']),
  captured_by:  z.string().uuid(),
  notes:        z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor', 'learner']);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const { page, limit, from, to } = getPagination(sp);

  let query = supabase
    .from('attendance')
    .select(`
      attendance_id, session_date, status, notes, created_at,
      learners!inner(learner_profiles(first_name, last_name)),
      programs(program_name)
    `, { count: 'exact' })
    .range(from, to)
    .order('session_date', { ascending: false });

  const programId  = sp.get('program_id');
  const learnerId  = sp.get('learner_id');
  const fromDate   = sp.get('from_date');
  const toDate     = sp.get('to_date');
  const status     = sp.get('status');

  if (programId) query = query.eq('program_id', programId);
  if (learnerId) query = query.eq('learner_id', learnerId);
  if (fromDate)  query = query.gte('session_date', fromDate);
  if (toDate)    query = query.lte('session_date', toDate);
  if (status)    query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) return err(error.message, 500);

  interface AttRow2 { attendance_id:string; session_date:string; status:string; notes:string|null; created_at:string; learners:{learner_profiles:{first_name:string;last_name:string}|null}|null; programs:{program_name:string}|null }
  const shaped = ((data || []) as unknown as AttRow2[]).map(a => ({
    attendance_id: a.attendance_id,
    session_date:  a.session_date,
    status:        a.status,
    notes:         a.notes,
    created_at:    a.created_at,
    learner_name:  `${a.learners?.learner_profiles?.first_name} ${a.learners?.learner_profiles?.last_name}`,
    program_name:  a.programs?.program_name,
  }));

  return paginatedResponse(shaped, count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = singleSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('attendance')
    .upsert(parsed.data, { onConflict: 'learner_id,program_id,session_date' })
    .select()
    .single();

  if (error) return err(error.message, 500);

  // Trigger async risk recalculation
  await supabase.rpc('calculate_risk_scores').then(() => {});

  return created(data);
}