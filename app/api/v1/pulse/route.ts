export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const BARRIERS = ['academic', 'personal', 'health', 'financial', 'transport', 'other'] as const;

const submitSchema = z.object({
  learner_id:   z.string().uuid(),
  week_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rating:       z.number().int().min(1).max(5),
  barrier_flag: z.enum(BARRIERS).optional().nullable(),
  notes:        z.string().max(500).optional().nullable(),
});

// Returns the current week's pulse for the given learner (or null if not yet submitted)
export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['learner', 'admin', 'instructor']);
  if (denied) return denied;

  const learnerId = req.nextUrl.searchParams.get('learner_id');
  const weekDate  = req.nextUrl.searchParams.get('week_date');
  if (!learnerId) return err('learner_id required');

  if (weekDate) {
    const { data, error } = await supabase
      .from('learner_pulse')
      .select('*')
      .eq('learner_id', learnerId)
      .eq('week_date', weekDate)
      .single();
    if (error && error.code !== 'PGRST116') return err(error.message, 500);
    return ok(data ?? null);
  }

  const limitN = parseInt(req.nextUrl.searchParams.get('limit') ?? '12');
  const { data, error } = await supabase
    .from('learner_pulse')
    .select('*')
    .eq('learner_id', learnerId)
    .order('week_date', { ascending: false })
    .limit(limitN);

  if (error) return err(error.message, 500);
  return ok(data);
}

// Submit (or update) the current week's pulse
export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['learner', 'admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('learner_pulse')
    .upsert(parsed.data, { onConflict: 'learner_id,week_date' })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}
