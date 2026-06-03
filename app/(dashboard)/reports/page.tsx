import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FileText, Users, CalendarCheck2, BarChart3, FolderKanban, Download, TrendingUp, Award, School } from 'lucide-react';
import ReportsClient from './ReportsClient';

async function getReportData() {
  const supabase = await createClient();

  const [
    learnersRes, schoolsRes, programsRes,
    attendanceRes, assessmentsRes, projectsRes,
    interventionsRes, sponsorsRes,
  ] = await Promise.all([
    supabase.from('learners').select(`
      learner_id, grade, programme_status, enrollment_date,
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

  // Pre-compute summary stats
  const totalLearners   = data.learners.length;
  const activeLearners  = data.learners.filter((l: any) => l.programme_status === 'active').length;
  const totalAtt        = data.attendance.length;
  const presentAtt      = data.attendance.filter((a: any) => a.status === 'present').length;
  const overallAttRate  = totalAtt ? Math.round(presentAtt / totalAtt * 100) : 0;
  const totalAss        = data.assessments.length;
  const avgScore        = totalAss
    ? Math.round(data.assessments.reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / totalAss)
    : 0;
  const completedProj   = data.projects.filter((p: any) => p.completion_status === 'completed').length;
  const highRisk        = data.learners.filter((l: any) => l.risk_scores?.risk_level === 'high').length;
  const openInterv      = data.interventions.filter((i: any) => i.status === 'open').length;

  // School breakdown
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

  // Grade breakdown
  const gradeMap: Record<number, { count: number; att: number; score: number }> = {};
  data.learners.forEach((l: any) => {
    const g = l.grade;
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

  // Programme breakdown
  const progMap: Record<string, { name: string; type: string; learners: number; att: number; assCount: number; avgScore: number }> = {};
  data.programs.forEach((p: any) => {
    progMap[p.program_id] = { name: p.program_name, type: p.program_type, learners: 0, att: 0, assCount: 0, avgScore: 0 };
  });
  data.attendance.forEach((a: any) => {
    if (a.program_id && progMap[a.program_id] && a.status === 'present') progMap[a.program_id].att++;
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

  // Sponsor breakdown
  const sponsorBreakdown = (data.sponsors || []).map((s: any) => ({
    name:  s.sponsor_name,
    count: s.sponsor_learners?.length || 0,
  })).filter((s: any) => s.count > 0).sort((a: any, b: any) => b.count - a.count);

  return (
    <div className="max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-700" /> Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide data overview — exportable</p>
        </div>
      </div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Learners',    value: totalLearners,  sub: `${activeLearners} active`,    icon: Users,         color: 'text-brand-700',  bg: 'bg-brand-50' },
          { label: 'Attendance Rate',   value: `${overallAttRate}%`, sub: `${totalAtt} records`,   icon: CalendarCheck2,color: overallAttRate >= 75 ? 'text-mint-600' : 'text-red-600', bg: overallAttRate >= 75 ? 'bg-mint-50' : 'bg-red-50' },
          { label: 'Avg Score',         value: `${avgScore}%`, sub: `${totalAss} assessments`,     icon: BarChart3,     color: avgScore >= 60 ? 'text-blue-600' : 'text-red-600', bg: avgScore >= 60 ? 'bg-blue-50' : 'bg-red-50' },
          { label: 'Projects Done',     value: completedProj,  sub: `${data.projects.length} total`,icon: FolderKanban, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'High Risk',         value: highRisk,       sub: 'need support',                 icon: TrendingUp,   color: highRisk > 0 ? 'text-red-600' : 'text-gray-400', bg: highRisk > 0 ? 'bg-red-50' : 'bg-gray-50' },
          { label: 'Open Interventions',value: openInterv,     sub: 'unresolved',                   icon: Award,        color: openInterv > 0 ? 'text-amber-600' : 'text-gray-400', bg: openInterv > 0 ? 'bg-amber-50' : 'bg-gray-50' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl p-4 ${bg} border border-gray-100`}>
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5 leading-tight">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      <ReportsClient
        schoolBreakdown={schoolBreakdown}
        gradeBreakdown={gradeBreakdown}
        programmeBreakdown={programmeBreakdown}
        sponsorBreakdown={sponsorBreakdown}
        rawLearners={data.learners}
        rawAttendance={data.attendance}
        rawAssessments={data.assessments}
        rawProjects={data.projects}
      />
    </div>
  );
}
