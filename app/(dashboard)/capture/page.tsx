import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import CaptureClient from './CaptureClient';

export interface CaptureProgramme {
  program_id:   string;
  program_name: string;
}

export interface CaptureLearner {
  learner_id:  string;
  learner_code: string;
  name:        string;
  school:      string;
}

async function getCaptureData(userId: string) {
  const supabase = await createClient();

  const [progRes, learnersRes] = await Promise.all([
    supabase.from('programs').select('program_id, program_name')
      .eq('is_active', true).order('program_name'),

    supabase.from('program_enrollments').select(`
      learner_id,
      program_id,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name)
      )
    `).eq('status', 'active'),
  ]);

  type EnrollRow = { learner_id: string; program_id: string; learners: { learner_id: string; learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null } | null };

  const programmes = (progRes.data || []) as CaptureProgramme[];

  // Group learners by programme_id
  const byProg: Record<string, CaptureLearner[]> = {};
  ((learnersRes.data || []) as unknown as EnrollRow[]).forEach(e => {
    if (!e.learners) return;
    const l = e.learners;
    if (!byProg[e.program_id]) byProg[e.program_id] = [];
    // avoid duplicates
    if (!byProg[e.program_id].find(x => x.learner_id === l.learner_id)) {
      byProg[e.program_id].push({
        learner_id:   l.learner_id,
        learner_code: l.learner_code,
        name:         `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
        school:       l.schools?.school_name ?? '—',
      });
    }
  });

  // Sort each programme's learners by name
  Object.values(byProg).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));

  return { programmes, byProg, userId };
}

export default async function CapturePage() {
  const user = await requireAuth(['admin', 'instructor']);
  const { programmes, byProg, userId } = await getCaptureData(user.user_id);

  return (
    <CaptureClient
      programmes={programmes}
      learnersByProg={byProg}
      capturedBy={userId}
    />
  );
}
