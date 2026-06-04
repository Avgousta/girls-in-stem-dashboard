export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const createSchema = z.object({
  learner_id:  z.string().uuid(),
  mentor_id:   z.string().uuid(),
  title:       z.string().min(2),
  description: z.string().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('mentorship_goals')
    .insert({ ...parsed.data, status: 'active', progress: 0 })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}