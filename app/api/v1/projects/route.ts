export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

const createSchema = z.object({
  learner_id:        z.string().uuid(),
  program_id:        z.string().uuid().optional(),
  project_name:      z.string().min(1),
  description:       z.string().optional(),
  stage:             z.enum(['planning','in_progress','review','submitted','marked']).default('planning'),
  completion_status: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
  score:             z.number().min(0).optional(),
  max_score:         z.number().min(1).default(100),
  due_date:          z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const { page, limit, from, to } = getPagination(sp);

  let query = supabase
    .from('projects')
    .select(`
      project_id, project_name, completion_status, score, max_score, submitted_at, created_at,
      learners!inner(learner_profiles(first_name, last_name)),
      programs(program_name)
    `, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  const programId = sp.get('program_id');
  const learnerId = sp.get('learner_id');
  const status    = sp.get('status');
  if (programId) query = query.eq('program_id', programId);
  if (learnerId) query = query.eq('learner_id', learnerId);
  if (status)    query = query.eq('completion_status', status);

  const { data, count, error } = await query;
  if (error) return err(error.message, 500);

  interface ProjRow { project_id:string; project_name:string; completion_status:string; score:number|null; max_score:number|null; submitted_at:string|null; created_at:string; learners:{learner_profiles:{first_name:string;last_name:string}|null}|null; programs:{program_name:string}|null }
  const shaped = ((data || []) as unknown as ProjRow[]).map(p => ({
    project_id:        p.project_id,
    project_name:      p.project_name,
    completion_status: p.completion_status,
    score:             p.score,
    max_score:         p.max_score,
    submitted_at:      p.submitted_at,
    created_at:        p.created_at,
    learner_name: `${p.learners?.learner_profiles?.first_name} ${p.learners?.learner_profiles?.last_name}`,
    program_name: p.programs?.program_name,
  }));

  return paginatedResponse(shaped, count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor', 'learner']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const insertData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.completion_status === 'completed') {
    insertData.submitted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(insertData)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}