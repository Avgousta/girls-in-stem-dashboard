export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const sp        = req.nextUrl.searchParams;
  const fromDate  = sp.get('from') || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);
  const toDate    = sp.get('to')   || new Date().toISOString().slice(0,10);
  const programId = sp.get('program_id');
  const learnerId = sp.get('learner_id');
  const limit     = Math.min(1000, Number(sp.get('limit') || 500));

  let query = supabase
    .from('attendance')
    .select(`
      attendance_id, session_date, status, notes,
      learners!inner(
        learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      programs(program_name)
    `)
    .gte('session_date', fromDate)
    .lte('session_date', toDate)
    .order('session_date', { ascending: false })
    .order('attendance_id', { ascending: true })
    .limit(limit);

  if (programId) query = query.eq('program_id', programId);
  if (learnerId) query = query.eq('learner_id', learnerId);

  const { data, error } = await query;
  if (error) return err(error.message, 500);

  interface AttHRow { attendance_id:string; session_date:string; status:string; notes:string|null; learners:{learner_code:string;learner_profiles:{first_name:string;last_name:string}|null;schools:{school_name:string}|null}|null; programs:{program_name:string}|null }
  const shaped = ((data || []) as unknown as AttHRow[]).map(r => ({
    attendance_id: r.attendance_id,
    session_date:  r.session_date,
    status:        r.status,
    notes:         r.notes,
    learner_name:  `${r.learners?.learner_profiles?.first_name ?? ''} ${r.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    learner_code:  r.learners?.learner_code,
    school_name:   r.learners?.schools?.school_name ?? '—',
    program_name:  r.programs?.program_name ?? '—',
  }));

  return ok(shaped);
}