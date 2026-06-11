export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const issueSchema = z.object({
  learner_id:   z.string().uuid(),
  programme_id: z.string().uuid().optional().nullable(),
  cert_type:    z.enum(['completion', 'achievement', 'participation']).default('completion'),
  issued_at:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
  notes:        z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor', 'learner']);
  if (denied) return denied;

  const learnerId = req.nextUrl.searchParams.get('learner_id');
  if (!learnerId) return err('learner_id required');

  const { data, error } = await supabase
    .from('certificates')
    .select('*, programs(program_name)')
    .eq('learner_id', learnerId)
    .order('issued_at', { ascending: false });

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('certificates')
    .insert({ ...parsed.data, issued_by: profile?.user_id })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}
