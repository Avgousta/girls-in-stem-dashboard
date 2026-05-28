import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

const createSchema = z.object({
  school_name:    z.string().min(2),
  district:       z.string().min(1),
  province:       z.string().min(1),
  contact_person: z.string().optional(),
  contact_email:  z.string().email().optional(),
  contact_phone:  z.string().optional(),
});

export async function GET(req: NextRequest) {
  // Schools list is public — needed for registration page
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const sp = req.nextUrl.searchParams;
  const { page, limit, from, to } = getPagination(sp);

  const { data, count, error } = await supabase
    .from('schools')
    .select('school_id, school_name, district, province', { count: 'exact' })
    .eq('is_active', true)
    .range(from, to)
    .order('school_name');

  if (error) return err(error.message, 500);
  return paginatedResponse(data || [], count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('schools')
    .insert(parsed.data)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}
