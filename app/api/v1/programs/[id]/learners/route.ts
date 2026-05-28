import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('program_enrollments')
    .select(`
      enrollment_id, status,
      learners!inner(
        learner_id, learner_code, grade, programme_status,
        learner_profiles(first_name, last_name, email),
        schools(school_name)
      )
    `)
    .eq('program_id', (await params).id)
    .eq('status', 'active');

  if (error) return err(error.message, 500);

  const shaped = (data || []).map((e: any) => ({
    learner_id:   e.learners.learner_id,
    learner_code: e.learners.learner_code,
    grade:        e.learners.grade,
    full_name:    `${e.learners.learner_profiles?.first_name} ${e.learners.learner_profiles?.last_name}`,
    first_name:   e.learners.learner_profiles?.first_name,
    last_name:    e.learners.learner_profiles?.last_name,
    email:        e.learners.learner_profiles?.email,
    school_name:  e.learners.schools?.school_name,
    programme_status: e.learners.programme_status,
  }));

  return ok(shaped);
}
