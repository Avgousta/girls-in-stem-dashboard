export const dynamic = 'force-dynamic';

import { requireApiAuth, ok, err } from '@/app/api/helpers';
import type { AttendanceTrend, ScoreDistribution, SchoolComparison } from '@/types';

export async function GET() {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const [attTrend, scoreDist, schoolComp] = await Promise.all([
    getAttendanceTrend(supabase),
    getScoreDistribution(supabase),
    getSchoolComparison(supabase),
  ]);

  return ok({ attTrend, scoreDist, schoolComp });
}

async function getAttendanceTrend(supabase: any): Promise<AttendanceTrend[]> {
  const { data } = await supabase
    .from('attendance')
    .select('session_date, status')
    .gte('session_date', new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
    .order('session_date');

  if (!data?.length) return [];

  // Group by week
  const weeks: Record<string, { present: number; total: number }> = {};
  for (const row of data) {
    const d    = new Date(row.session_date);
    const mon  = new Date(d.setDate(d.getDate() - d.getDay() + 1));
    const week = mon.toISOString().slice(0, 10);
    if (!weeks[week]) weeks[week] = { present: 0, total: 0 };
    weeks[week].total++;
    if (row.status === 'present') weeks[week].present++;
  }

  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, { present, total }]) => ({
      week: new Date(week).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      rate:    Math.round((present / total) * 100),
      present,
      absent:  total - present,
    }));
}

async function getScoreDistribution(supabase: any): Promise<ScoreDistribution[]> {
  const { data } = await supabase
    .from('assessments')
    .select('grade_band');

  if (!data?.length) return [];

  const counts: Record<string, number> = {
    Distinction: 0, Merit: 0, Pass: 0, 'Needs Support': 0,
  };
  for (const row of data) {
    if (row.grade_band && counts[row.grade_band] !== undefined) counts[row.grade_band]++;
  }

  const total = data.length;
  return Object.entries(counts).map(([grade_band, count]) => ({
    grade_band: grade_band as any,
    count,
    percentage: total ? Math.round((count / total) * 100) : 0,
  }));
}

async function getSchoolComparison(supabase: any): Promise<SchoolComparison[]> {
  const { data: schools } = await supabase
    .from('schools')
    .select('school_id, school_name')
    .eq('is_active', true);

  if (!schools?.length) return [];

  const results: SchoolComparison[] = [];
  for (const school of schools) {
    const [{ count: learnerCount }, { data: attData }, { data: scoreData }] = await Promise.all([
      supabase.from('learners').select('*', { count: 'exact', head: true }).eq('school_id', school.school_id),
      supabase.from('attendance').select('status').eq('learners.school_id', school.school_id),
      supabase.from('assessments').select('percentage').eq('learners.school_id', school.school_id),
    ]);

    const att   = attData || [];
    const scores= scoreData || [];
    results.push({
      school_name:    school.school_name,
      learner_count:  learnerCount || 0,
      avg_attendance: att.length ? Math.round(att.filter((a: any) => a.status === 'present').length / att.length * 100) : 0,
      avg_score:      scores.length ? Math.round(scores.reduce((s: number, a: any) => s + Number(a.percentage), 0) / scores.length) : 0,
    });
  }

  return results.sort((a, b) => b.avg_attendance - a.avg_attendance);
}