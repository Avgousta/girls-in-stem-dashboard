import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AnalyticsClient from './AnalyticsClient';
import { DS } from '@/components/platform/tokens';
import { BarChart2 } from 'lucide-react';

// ─── Types returned to client ─────────────────────────────────────────────────
export interface CohortRow {
  key:        string;   // school name / programme name / "Grade N"
  learners:   number;
  att_rate:   number;   // 0–100
  avg_score:  number;   // 0–100
  high_risk:  number;
  medium_risk: number;
  low_risk:   number;
  completions: number;  // assessments recorded
}

async function getAnalyticsData() {
  const supabase = await createClient();

  const [learnersRes, riskRes, attRes, assRes, enrollRes] = await Promise.all([
    supabase.from('learners').select(`
      learner_id, grade, programme_status, enrollment_date,
      schools(school_name),
      program_enrollments(program_id, programs(program_name))
    `).eq('programme_status', 'active'),

    supabase.from('risk_scores').select('learner_id, risk_level, attendance_rate, avg_score'),

    supabase.from('attendance').select('learner_id, status, session_date'),

    supabase.from('assessments').select('learner_id, percentage, assessment_date'),

    supabase.from('program_enrollments').select('learner_id, program_id, programs(program_name)'),
  ]);

  type LearnerRow = { learner_id: string; grade: number; programme_status: string; enrollment_date: string | null; schools: { school_name: string } | null; program_enrollments: Array<{ program_id: string; programs: { program_name: string } | null }> };
  type RiskRow    = { learner_id: string; risk_level: string; attendance_rate: number; avg_score: number };
  type AttRow     = { learner_id: string; status: string; session_date: string };
  type AssRow     = { learner_id: string; percentage: number | null; assessment_date: string };
  type EnrollRow  = { learner_id: string; program_id: string; programs: { program_name: string } | null };

  const learners = (learnersRes.data || []) as unknown as LearnerRow[];
  const risks    = (riskRes.data    || []) as unknown as RiskRow[];
  const att      = (attRes.data     || []) as unknown as AttRow[];
  const ass      = (assRes.data     || []) as unknown as AssRow[];
  const enrolls  = (enrollRes.data  || []) as unknown as EnrollRow[];

  // Index maps
  const riskMap = Object.fromEntries(risks.map(r => [r.learner_id, r]));
  const attByLearner: Record<string, AttRow[]> = {};
  att.forEach(a => { (attByLearner[a.learner_id] ??= []).push(a); });
  const assByLearner: Record<string, AssRow[]> = {};
  ass.forEach(a => { (assByLearner[a.learner_id] ??= []).push(a); });

  // ── By School ──────────────────────────────────────────────────────────────
  const schoolMap: Record<string, string[]> = {};
  learners.forEach(l => {
    const s = l.schools?.school_name ?? 'Unknown';
    (schoolMap[s] ??= []).push(l.learner_id);
  });

  // ── By Programme ──────────────────────────────────────────────────────────
  const progMap: Record<string, string[]> = {};
  enrolls.forEach(e => {
    const n = e.programs?.program_name ?? 'Unknown';
    (progMap[n] ??= []).push(e.learner_id);
  });

  // ── By Grade ──────────────────────────────────────────────────────────────
  const gradeMap: Record<string, string[]> = {};
  learners.forEach(l => {
    const g = `Grade ${l.grade}`;
    (gradeMap[g] ??= []).push(l.learner_id);
  });

  // ── By Enrolment Year ─────────────────────────────────────────────────────
  const yearMap: Record<string, string[]> = {};
  learners.forEach(l => {
    const yr = l.enrollment_date ? new Date(l.enrollment_date).getFullYear().toString() : 'Unknown';
    (yearMap[yr] ??= []).push(l.learner_id);
  });

  function buildCohorts(groupMap: Record<string, string[]>): CohortRow[] {
    return Object.entries(groupMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, ids]) => {
        const uniqueIds = [...new Set(ids)];
        let totalAtt = 0, presentAtt = 0, totalScore = 0, scoreCount = 0;
        let high = 0, medium = 0, low = 0, assCount = 0;

        uniqueIds.forEach(id => {
          const r = riskMap[id];
          if (r) {
            if (r.risk_level === 'high')   high++;
            else if (r.risk_level === 'medium') medium++;
            else low++;

            if (r.attendance_rate != null) { totalAtt += r.attendance_rate; presentAtt++; }
            if (r.avg_score != null)       { totalScore += r.avg_score; scoreCount++; }
          }
          assCount += (assByLearner[id] || []).length;
        });

        return {
          key,
          learners:    uniqueIds.length,
          att_rate:    presentAtt > 0 ? Math.round(totalAtt / presentAtt) : 0,
          avg_score:   scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
          high_risk:   high,
          medium_risk: medium,
          low_risk:    low,
          completions: assCount,
        };
      });
  }

  return {
    bySchool:    buildCohorts(schoolMap),
    byProgramme: buildCohorts(progMap),
    byGrade:     buildCohorts(gradeMap),
    byYear:      buildCohorts(yearMap),
    totalActive: learners.length,
  };
}

export default async function AnalyticsPage() {
  await requireAuth(['admin', 'instructor']);
  const data = await getAnalyticsData();

  return (
    <div className="space-y-6 pb-20" style={{ color: DS.text }}>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: DS.textMuted }}>
          Cohort Analytics
        </p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: DS.text }}>
          <BarChart2 className="w-6 h-6" style={{ color: DS.primary }} />
          Cohort Comparison
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
          Compare attendance, scores, and risk across schools, programmes, grades, and cohort years.
          Based on {data.totalActive} active learners.
        </p>
      </div>

      <AnalyticsClient
        bySchool={data.bySchool}
        byProgramme={data.byProgramme}
        byGrade={data.byGrade}
        byYear={data.byYear}
      />
    </div>
  );
}
