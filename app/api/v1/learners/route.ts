export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

const createSchema = z.object({
  first_name:      z.string().min(1),
  last_name:       z.string().min(1),
  grade:           z.number().int().min(8).max(12),
  school_id:       z.string().uuid(),
  email:           z.string().email().optional().or(z.literal('')),
  phone:           z.string().optional(),
  parent_name:     z.string().optional(),
  parent_contact:  z.string().optional(),
  enrollment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Accept one or many programme IDs
  program_ids:     z.array(z.string().uuid()).min(1, 'Select at least one programme'),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const sp    = req.nextUrl.searchParams;
  const { page, limit, from, to } = getPagination(sp);
  const search    = sp.get('search') || '';
  const schoolId  = sp.get('school_id');
  const status    = sp.get('status');

  let query = supabase
    .from('learners')
    .select(`
      learner_id, learner_code, grade, enrollment_date, programme_status,
      learner_profiles(first_name, last_name, email, phone, parent_name, parent_contact),
      schools(school_name, district),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(programs(program_name))
    `, { count: 'exact' })
    .range(from, to)
    .order('learner_code');

  if (schoolId) query = query.eq('school_id', schoolId);
  if (status)   query = query.eq('programme_status', status);

  const { data, count, error } = await query;
  if (error) return err(error.message, 500);

  const shaped = (data || []).map((l: any) => ({
    learner_id:       l.learner_id,
    learner_code:     l.learner_code,
    grade:            l.grade,
    enrollment_date:  l.enrollment_date,
    programme_status: l.programme_status,
    first_name:       l.learner_profiles?.first_name,
    last_name:        l.learner_profiles?.last_name,
    full_name:        `${l.learner_profiles?.first_name} ${l.learner_profiles?.last_name}`,
    email:            l.learner_profiles?.email,
    school_name:      l.schools?.school_name,
    risk_level:       l.risk_scores?.risk_level || 'low',
    attendance_rate:  l.risk_scores?.attendance_rate || 0,
    avg_score:        l.risk_scores?.avg_score || 0,
    programs:         (l.program_enrollments || []).map((e: any) => e.programs?.program_name).filter(Boolean),
  })).filter(l => !search ||
    l.full_name.toLowerCase().includes(search.toLowerCase()) ||
    l.learner_code.toLowerCase().includes(search.toLowerCase()));

  return paginatedResponse(shaped, count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const d = parsed.data;

  // Generate learner code
  const { data: existing } = await supabase
    .from('learners').select('learner_code')
    .order('learner_code', { ascending: false }).limit(1);
  const lastNum = existing?.length
    ? parseInt((existing[0].learner_code || '').replace(/\D/g, ''), 10) || 0 : 0;
  const learnerCode = `LRN${String(lastNum + 1).padStart(3, '0')}`;

  // Insert learner
  const { data: learner, error: lerr } = await supabase
    .from('learners')
    .insert({
      school_id:        d.school_id,
      grade:            d.grade,
      enrollment_date:  d.enrollment_date,
      learner_code:     learnerCode,
      programme_status: 'active',
    })
    .select('learner_id')
    .single();
  if (lerr) return err(lerr.message, 500);

  // Insert profile
  await supabase.from('learner_profiles').insert({
    learner_id:     learner.learner_id,
    first_name:     d.first_name,
    last_name:      d.last_name,
    email:          d.email   || null,
    phone:          d.phone   || null,
    parent_name:    d.parent_name    || null,
    parent_contact: d.parent_contact || null,
  });

  // Enroll in ALL selected programmes
  const enrollments = d.program_ids.map(pid => ({
    learner_id: learner.learner_id,
    program_id: pid,
    status:     'active',
  }));
  await supabase.from('program_enrollments').insert(enrollments);

  // Init risk score
  await supabase.from('risk_scores').insert({
    learner_id: learner.learner_id,
    risk_level: 'low',
  });

  return created({ learner_id: learner.learner_id, learner_code: learnerCode });
}