export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const surveySchema = z.object({
  survey_type:      z.enum(['exit', '6_month', '1_year', '3_year']),
  survey_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
  stem_career:      z.boolean().optional().nullable(),
  programme_impact: z.number().int().min(1).max(5).optional().nullable(),
  notes:            z.string().optional().nullable(),
});

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = surveySchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('alumni_surveys')
    .upsert({ ...parsed.data, alumni_id: (await params).id }, { onConflict: 'alumni_id,survey_type' })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}
