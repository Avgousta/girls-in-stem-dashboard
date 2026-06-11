export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const TYPES = ['academic','personal','health','financial','transport','confidence','family','other'] as const;

const createSchema = z.object({
  barrier_type: z.enum(TYPES),
  severity:     z.number().int().min(1).max(3).default(2),
  reported_by:  z.enum(['learner','staff','parent']).default('staff'),
  notes:        z.string().max(500).optional().nullable(),
});

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { data, error } = await supabase
    .from('learner_barriers')
    .select('*')
    .eq('learner_id', id)
    .order('active', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const { data, error } = await supabase
    .from('learner_barriers')
    .insert({ ...parsed.data, learner_id: id })
    .select().single();
  if (error) return err(error.message, 500);
  return created(data);
}
