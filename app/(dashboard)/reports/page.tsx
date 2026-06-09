import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FileText, Users, CalendarCheck2, BarChart3, FolderKanban, TrendingUp, Award } from 'lucide-react';
import ReportsClient from './ReportsClient';
import { KPICard } from '@/components/interventions/InterventionBadges';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

async function getReportData() {
  const supabase = await createClient();

  const [
    learnersRes, schoolsRes, programsRes,
    attendanceRes, assessmentsRes, projectsRes,
    interventionsRes, sponsorsRes,
  ] = await Promise.all([
    supabase.from('learners').select(`
      learner_id, learner_code, grade, programme_status, enrollment_date,
      learner_profiles(first_name, last_name),
      schools(school_name),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(programs(program_name, program_type))
    `),
    supabase.from('schools').select('school_id, school_name').eq('is_active', true).order('school_name'),
    supabase.from('programs').select('program_id, program_name, program_type').eq('is_active', true).order('program_name'),
    supabase.from('attendance').select('learner_id, status, session_date, program_id, programs(program_name)'),
    supabase.from('assessments').select('learner_id, subject, percentage, grade_band, assessment_date, program_id, programs(program_name)'),
    supabase.from('projects').select('learner_id, project_name, stage, completion_status, score, max_score, due_date, programs(program_name)'),
    supabase.from('interventions').select('learner_id, status, created_at'),
    supabase.from('sponsors').select('sponsor_id, sponsor_name, sponsor_learners(learner_id)'),
  ]);

  return {
    learners:      learnersRes.data      || [],
    schools:       schoolsRes.data       || [],
    programs:      programsRes.data      || [],
    attendance:    attendanceRes.data    || [],
    assessments:   assessmentsRes.data   || [],
    projects:      projectsRes.data      || [],
    interventions: interventionsRes.data || [],
    sponsors:      sponsorsRes.data      || [],
  };
}

export default async function ReportsPage() {
  await requireAuth(['admin', 'instructor']);
  const data = await getReportData();

  // ── KPI aggregates ──────────────────────────────────────────────────────────
  const totalLearners  = data.learners.length;
  const activeLearners = data.learners.filter((l: any) => l.programme_status === 'active').length;
  const totalAtt       = data.attendance.length;
  const presentAtt     = data.attendance.filter((a: any) => a.status === 'present').length;
  const overallAttRate = totalAtt ? Math.round(presentAtt / totalAtt * 100) : 0;
  const totalAss       = data.assessments.length;
  const avgScore       = totalAss
    ? Math.round(data.assessments.reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / totalAss)
    : 0;
  const completedProj  = data.projects.filter((p: any) => p.completion_status === 'completed').length;
  const highRisk       = data.learners.filter((l: any) => l.risk_scores?.risk_level === 'high').length;
  const openInterv     = data.interventions.filter((i: any) => i.status === 'open').length;

  // ── School breakdown ────────────────────────────────────────────────────────
  const schoolMap: Record<string, { name: string; count: number; att: number; score: number }> = {};
  data.learners.forEach((l: any) => {
    const name = l.schools?.school_name || 'Unknown';
    if (!schoolMap[name]) schoolMap[name] = { name, count: 0, att: 0, score: 0 };
    schoolMap[name].count++;
    if (l.risk_scores) {
      schoolMap[name].att   += l.risk_scores.attendance_rate || 0;
      schoolMap[name].score += l.risk_scores.avg_score || 0;
    }
  });
  const schoolBreakdown = Object.values(schoolMap).map(s => ({
    ...s,
    att:   s.count ? Math.round(s.att   / s.count) : 0,
    score: s.count ? Math.round(s.score / s.count) : 0,
  })).sort((a, b) => b.count - a.count);

  // ── Grade breakdown ─────────────────────────────────────────────────────────
  const gradeMap: Record<number, { count: number; att: number; score: number }> = {};
  data.learners.forEach((l: any) => {
    const g = l.grade;
    if (g == null) return;
    if (!gradeMap[g]) gradeMap[g] = { count: 0, att: 0, score: 0 };
    gradeMap[g].count++;
    if (l.risk_scores) {
      gradeMap[g].att   += l.risk_scores.attendance_rate || 0;
      gradeMap[g].score += l.risk_scores.avg_score || 0;
    }
  });
  const gradeBreakdown = Object.entries(gradeMap)
    .map(([grade, s]) => ({
      grade: Number(grade),
      count: s.count,
      att:   s.count ? Math.round(s.att   / s.count) : 0,
      score: s.count ? Math.round(s.score / s.count) : 0,
    }))
    .sort((a, b) => a.grade - b.grade);

  // ── Programme breakdown ─────────────────────────────────────────────────────
  const progMap: Record<string, { name: string; type: string; learners: number; att: number; assCount: number; avgScore: number }> = {};
  data.programs.forEach((p: any) => {
    progMap[p.program_id] = { name: p.program_name, type: p.program_type, learners: 0, att: 0, assCount: 0, avgScore: 0 };
  });
  data.assessments.forEach((a: any) => {
    if (a.program_id && progMap[a.program_id]) {
      progMap[a.program_id].assCount++;
      progMap[a.program_id].avgScore += Number(a.percentage || 0);
    }
  });
  const programmeBreakdown = Object.values(progMap).map(p => ({
    ...p,
    avgScore: p.assCount ? Math.round(p.avgScore / p.assCount) : 0,
  })).sort((a, b) => b.learners - a.learners);

  // ── Sponsor breakdown ───────────────────────────────────────────────────────
  const sponsorBreakdown = (data.sponsors || []).map((s: any) => ({
    name:  s.sponsor_name,
    count: s.sponsor_learners?.length || 0,
  })).filter((s: any) => s.count > 0).sort((a: any, b: any) => b.count - a.count);

  // ── Score distribution by grade band ───────────────────────────────────────
  const bandMap: Record<string, number> = {
    Distinction: 0, Merit: 0, Pass: 0, 'Needs Support': 0,
  };
  data.assessments.forEach((a: any) => {
    if (a.grade_band && bandMap[a.grade_band] !== undefined) bandMap[a.grade_band]++;
  });
  const scoreDist = Object.entries(bandMap).map(([band, count]) => ({ band, count }));

  return (
    <div className="max-w-7xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>
          <FileText className="w-6 h-6" style={{ color: 'var(--ds-purple)' }} />
          Reports &amp; Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>
          Platform-wide data overview — exportable
        </p>
      </div>

      {/* Quick link to bulk report export */}
      <Link href="/reports/bulk"
        className="flex items-center gap-3 rounded-2xl p-4 transition-colors"
        style={{ background: DS.primaryLight, border: `1px solid ${DS.primaryBorder}` }}>
        <FileText className="w-5 h-5 shrink-0" style={{ color: DS.primary }} />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: DS.text }}>Bulk Learner Report Export</p>
          <p className="text-xs" style={{ color: DS.textMuted }}>Select learners and open printable report cards in new tabs</p>
        </div>
        <span className="text-xs font-semibold" style={{ color: DS.primary }}>Open →</span>
      </Link>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Total Learners"     value={totalLearners}         color="var(--ds-purple)"  sub={`${activeLearners} active`}         icon={Users}         />
        <KPICard label="Attendance Rate"    value={`${overallAttRate}%`}  color={overallAttRate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)'} sub={`${totalAtt} records`} icon={CalendarCheck2} />
        <KPICard label="Avg Score"          value={`${avgScore}%`}        color={avgScore >= 60 ? 'var(--ds-success)' : 'var(--ds-danger)'}  sub={`${totalAss} assessments`}  icon={BarChart3}      />
        <KPICard label="Projects Done"      value={completedProj}         color="#A78BFA"            sub={`${data.projects.length} total`}    icon={FolderKanban}  />
        <KPICard label="High Risk"          value={highRisk}              color={highRisk > 0 ? 'var(--ds-danger)' : 'var(--ds-success)'}    sub="need support"               icon={TrendingUp}     />
        <KPICard label="Open Interventions" value={openInterv}            color={openInterv > 0 ? 'var(--ds-warn)' : 'var(--ds-success)'}   sub="unresolved"                 icon={Award}          />
      </div>

      <ReportsClient
        schoolBreakdown={schoolBreakdown}
        gradeBreakdown={gradeBreakdown}
        programmeBreakdown={programmeBreakdown}
        sponsorBreakdown={sponsorBreakdown}
        scoreDist={scoreDist}
        rawLearners={data.learners}
        rawAttendance={data.attendance}
        rawAssessments={data.assessments}
        rawProjects={data.projects}
        rawInterventions={data.interventions}
      />
    </div>
  );
}
