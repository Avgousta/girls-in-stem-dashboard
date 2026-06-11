import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AlumniClient from './AlumniClient';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

export interface AlumniRow {
  alumni_id:           string;
  learner_id:          string;
  graduated_at:        string;
  final_status:        string;
  higher_ed_enrolled:  boolean | null;
  institution:         string | null;
  career_field:        string | null;
  employed_in_stem:    boolean | null;
  consent_for_followup: boolean;
  notes:               string | null;
  learner_code:        string;
  name:                string;
  school:              string;
  grade:               number;
  surveys:             Array<{ survey_id: string; survey_type: string; survey_date: string; stem_career: boolean | null; programme_impact: number | null }>;
}

interface RawAlumni {
  alumni_id: string; learner_id: string; graduated_at: string; final_status: string;
  higher_ed_enrolled: boolean | null; institution: string | null; career_field: string | null;
  employed_in_stem: boolean | null; consent_for_followup: boolean; notes: string | null;
  learners: { learner_code: string; grade: number; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null } | null;
  alumni_surveys: Array<{ survey_id: string; survey_type: string; survey_date: string; stem_career: boolean | null; programme_impact: number | null }>;
}

async function getAlumniData() {
  const supabase = await createClient();

  const [alumniRes, graduatedRes] = await Promise.all([
    supabase.from('alumni').select(`
      alumni_id, learner_id, graduated_at, final_status,
      higher_ed_enrolled, institution, career_field, employed_in_stem,
      consent_for_followup, notes,
      learners!inner(
        learner_code, grade,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      alumni_surveys(survey_id, survey_type, survey_date, stem_career, programme_impact)
    `).order('graduated_at', { ascending: false }),

    // Learners with graduated status but no alumni record yet
    supabase.from('learners').select(`
      learner_id, learner_code, grade,
      learner_profiles(first_name, last_name),
      schools(school_name)
    `)
      .eq('programme_status', 'graduated')
      .not('learner_id', 'in', `(SELECT learner_id FROM alumni)`),
  ]);

  const alumni = ((alumniRes.data || []) as unknown as RawAlumni[]).map(a => ({
    alumni_id:            a.alumni_id,
    learner_id:           a.learner_id,
    graduated_at:         a.graduated_at,
    final_status:         a.final_status,
    higher_ed_enrolled:   a.higher_ed_enrolled,
    institution:          a.institution,
    career_field:         a.career_field,
    employed_in_stem:     a.employed_in_stem,
    consent_for_followup: a.consent_for_followup,
    notes:                a.notes,
    learner_code:         a.learners?.learner_code ?? '',
    name:                 `${a.learners?.learner_profiles?.first_name ?? ''} ${a.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    school:               a.learners?.schools?.school_name ?? '—',
    grade:                a.learners?.grade ?? 0,
    surveys:              a.alumni_surveys || [],
  })) satisfies AlumniRow[];

  interface UnrecordedLearner { learner_id: string; learner_code: string; grade: number; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null }
  const unrecorded = ((graduatedRes.data || []) as unknown as UnrecordedLearner[]).map(l => ({
    learner_id:   l.learner_id,
    learner_code: l.learner_code,
    grade:        l.grade,
    name:         `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
    school:       l.schools?.school_name ?? '—',
  }));

  return { alumni, unrecorded };
}

export default async function AlumniPage() {
  await requireAuth(['admin', 'instructor']);
  const { alumni, unrecorded } = await getAlumniData();

  const stemCount    = alumni.filter(a => a.employed_in_stem === true).length;
  const higherEdCount = alumni.filter(a => a.higher_ed_enrolled === true).length;
  const surveysDone  = alumni.filter(a => a.surveys.length > 0).length;

  return (
    <div className="space-y-6 pb-20" style={{ color: DS.text }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: DS.textMuted }}>
            Programme Alumni
          </p>
          <h1 className="text-2xl font-black" style={{ color: DS.text }}>
            Alumni Tracker
          </h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
            {alumni.length} graduate{alumni.length !== 1 ? 's' : ''} on record
          </p>
        </div>
        <Link href="/learners"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
          <GraduationCap className="w-4 h-4" /> Add from Learners
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden"
        style={{ background: DS.border, border: `1px solid ${DS.border}` }}>
        {[
          { label: 'Total Alumni',        value: alumni.length,    color: DS.primary as string },
          { label: 'In Higher Education', value: higherEdCount,    color: '#7C3AED' },
          { label: 'Employed in STEM',    value: stemCount,        color: 'var(--ds-success)' },
          { label: 'Surveys Completed',   value: surveysDone,      color: '#F59E0B' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-5 flex flex-col gap-1" style={{ background: DS.surface }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DS.textMuted }}>{label}</p>
            <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <AlumniClient alumni={alumni} unrecorded={unrecorded} />
    </div>
  );
}
