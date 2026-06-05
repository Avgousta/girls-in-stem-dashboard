import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import SponsorReportsClient from './SponsorReportsClient';
import { DS } from '@/components/platform/tokens';

export default async function SponsorReportsPage() {
  const user     = await requireAuth(['sponsor']);
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('sponsor_learners').select('learner_id').eq('sponsor_id', user.sponsor_id);
  const ids = (links || []).map((l: any) => l.learner_id);

  const { data: sponsor } = await supabase
    .from('sponsors').select('sponsor_name').eq('sponsor_id', user.sponsor_id).single();

  if (!ids.length) return (
    <div className="text-center py-20 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <p className="font-semibold" style={{ color: DS.textMuted }}>No learners linked yet.</p>
    </div>
  );

  const [assRes, attRes, projRes, learnersRes] = await Promise.all([
    supabase.from('assessments')
      .select('subject, percentage, grade_band, assessment_date, learner_id, programs(program_name)')
      .in('learner_id', ids).order('assessment_date'),
    supabase.from('attendance')
      .select('status, session_date, learner_id')
      .in('learner_id', ids).order('session_date'),
    supabase.from('projects')
      .select('project_name, completion_status, stage, score, max_score, learner_id, programs(program_name)')
      .in('learner_id', ids),
    supabase.from('learners')
      .select('learner_id, learner_code, learner_profiles(first_name, last_name), schools(school_name), risk_scores(risk_level, attendance_rate, avg_score), program_enrollments(programs(program_name, program_type))')
      .in('learner_id', ids),
  ]);

  return (
    <SponsorReportsClient
      sponsorName={(sponsor as any)?.sponsor_name || 'Sponsor'}
      assessments={assRes.data || []}
      attendance={attRes.data || []}
      projects={projRes.data || []}
      learners={learnersRes.data || []}
    />
  );
}
