export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const createSchema = z.object({
  learner_id:           z.string().uuid(),
  graduated_at:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
  final_status:         z.enum(['completed', 'withdrawn', 'transferred']).default('completed'),
  higher_ed_enrolled:   z.boolean().optional().nullable(),
  institution:          z.string().optional().nullable(),
  career_field:         z.string().optional().nullable(),
  employed_in_stem:     z.boolean().optional().nullable(),
  consent_for_followup: z.boolean().default(true),
  notes:                z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('alumni')
    .select(`
      *,
      learners!inner(
        learner_code, grade,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      alumni_surveys(survey_id, survey_type, survey_date, stem_career, programme_impact)
    `)
    .order('graduated_at', { ascending: false });

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('alumni')
    .upsert(parsed.data, { onConflict: 'learner_id' })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}
