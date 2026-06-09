export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

const createSchema = z.object({
  program_name:  z.string().min(1, 'Programme name is required'),
  program_type:  z.string().min(1, 'Select a programme type'),
  start_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date required'),
  end_date:      z.string().optional().or(z.literal('').transform(() => undefined)),
  instructor_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  school_id:     z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  max_capacity:  z.coerce.number().int().min(1).default(30),
  description:   z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor', 'learner']);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const { page, limit, from, to } = getPagination(sp);
  const activeOnly = sp.get('active') !== 'false';

  let query = supabase
    .from('programs')
    .select(`
      program_id, program_name, program_type, start_date, end_date, max_capacity, is_active, description,
      users!instructor_id(full_name),
      schools(school_name),
      program_enrollments(count)
    `, { count: 'exact' })
    .range(from, to)
    .order('start_date', { ascending: false });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, count, error } = await query;
  if (error) return err(error.message, 500);

  interface ProgRow { program_id:string; program_name:string; program_type:string; start_date:string; end_date:string|null; max_capacity:number; is_active:boolean; description:string|null; users:{full_name:string}|null; schools:{school_name:string}|null; program_enrollments:Array<unknown> }
  const shaped = ((data || []) as unknown as ProgRow[]).map(p => ({
    program_id:      p.program_id,
    program_name:    p.program_name,
    program_type:    p.program_type,
    start_date:      p.start_date,
    end_date:        p.end_date,
    max_capacity:    p.max_capacity,
    is_active:       p.is_active,
    description:     p.description,
    instructor_name: p.users?.full_name,
    school_name:     p.schools?.school_name,
    enrolled_count:  p.program_enrollments?.length || 0,
  }));

  return paginatedResponse(shaped, count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map(i => `${i.path.join('.') || 'field'}: ${i.message}`)
      .join(' | ');
    console.error('Program validation failed:', messages, '\nBody:', JSON.stringify(body));
    return err(messages);
  }

  // Only include defined values — let Postgres use column defaults for the rest
  const insert: Record<string, unknown> = {
    program_name: parsed.data.program_name,
    program_type: parsed.data.program_type,
    start_date:   parsed.data.start_date,
    max_capacity: parsed.data.max_capacity ?? 30,
    is_active:    true,
  };
  if (parsed.data.end_date)      insert.end_date      = parsed.data.end_date;
  if (parsed.data.instructor_id) insert.instructor_id = parsed.data.instructor_id;
  if (parsed.data.school_id)     insert.school_id     = parsed.data.school_id;
  if (parsed.data.description)   insert.description   = parsed.data.description;


  const { data, error } = await supabase
    .from('programs')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Program DB error:', error.message, '|', error.details, '|', error.hint);
    return err(error.message, 500);
  }

  return created(data);
}