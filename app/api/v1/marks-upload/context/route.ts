export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';

// Everything the upload page needs to match and preview a sheet for one
// programme: its learners, their existing labelled marks, and the remembered
// column mappings and name aliases.
export async function GET(req: NextRequest) {
  const { denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const programId = req.nextUrl.searchParams.get('program_id');
  if (!programId) return err('program_id is required');

  const admin = createAdminClient();
  const { data: enrol, error: enrolErr } = await admin
    .from('program_enrollments')
    .select('learners!inner(learner_id, learner_code, grade, schools(school_name), learner_profiles(first_name, last_name))')
    .eq('program_id', programId);
  if (enrolErr) return err(enrolErr.message, 500);

  type Row = { learners: { learner_id: string; learner_code: string; grade: number | null;
    schools: { school_name: string } | null; learner_profiles: { first_name: string | null; last_name: string | null } | null } };
  const learners = ((enrol ?? []) as unknown as Row[]).map(r => ({
    learner_id:   r.learners.learner_id,
    learner_code: r.learners.learner_code,
    grade:        r.learners.grade,
    school:       r.learners.schools?.school_name ?? null,
    first_name:   r.learners.learner_profiles?.first_name?.trim() ?? null,
    last_name:    r.learners.learner_profiles?.last_name?.trim() ?? null,
  })).sort((a, b) => a.learner_code.localeCompare(b.learner_code));

  const ids = learners.map(l => l.learner_id);
  const [marks, mappings, aliases] = await Promise.all([
    ids.length
      ? admin.from('assessments').select('learner_id, notes, score').in('learner_id', ids).not('notes', 'is', null).limit(20000)
      : Promise.resolve({ data: [], error: null }),
    admin.from('mark_column_mappings').select('header_key, kind, source, subject, term, grade'),
    admin.from('learner_name_aliases').select('alias_key, learner_id'),
  ]);
  if (marks.error)    return err(marks.error.message, 500);
  if (mappings.error) return err(mappings.error.message, 500);
  if (aliases.error)  return err(aliases.error.message, 500);

  return ok({
    learners,
    marks:    marks.data ?? [],
    mappings: mappings.data ?? [],
    aliases:  aliases.data ?? [],
  });
}
