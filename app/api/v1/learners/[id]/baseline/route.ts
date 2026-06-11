export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const schema = z.object({
  maths_confidence:   z.number().int().min(1).max(5),
  science_confidence: z.number().int().min(1).max(5),
  digital_confidence: z.number().int().min(1).max(5),
  prior_coding_exp:   z.boolean().default(false),
  notes:              z.string().max(500).optional().nullable(),
});

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { data, error } = await supabase
    .from('learner_baselines')
    .select('*')
    .eq('learner_id', id)
    .single();
  if (error && error.code !== 'PGRST116') return err(error.message, 500);
  return ok(data ?? null);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;
  const { id } = await params;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('learner_baselines')
    .upsert({ ...parsed.data, learner_id: id, captured_by: profile?.user_id }, { onConflict: 'learner_id' })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}
