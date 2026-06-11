import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FileText, Users, CalendarCheck2, BarChart3, FolderKanban, TrendingUp, Award } from 'lucide-react';
import ReportsClient from './ReportsClient';
import { KPICard } from '@/components/interventions/InterventionBadges';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

// ── Typed shapes for Supabase query results ────────────────────────────────────
interface RawLearner {
  learner_id: string;
  learner_code: string;
  grade: number | null;
  programme_status: string;
  enrollment_date: string;
  learner_profiles: { first_name: string; last_name: string } | null;
  schools: { school_name: string } | null;
  risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null;
  program_enrollments: Array<{ programs: { program_name: string; program_type: string } | null }>;
}
interface RawAttendance  { learner_id: string; status: string; session_date: string; program_id: string; programs: { program_name: string } | null }
interface RawAssessment  { learner_id: string; subject: string; percentage: number | null; grade_band: string | null; assessment_date: string | null; program_id: string | null; programs: { program_name: string } | null }
interface RawProject     { learner_id: string; project_name: string | null; stage: string | null; completion_status: string; score: number | null; max_score: number | null; due_date: string | null; programs: { program_name: string } | null }
interface RawIntervention { learner_id: string; status: string; created_at: string }
interface RawSponsor     { sponsor_id: string; sponsor_name: string; sponsor_learners: Array<{ learner_id: string }> | null }
interface RawProgram     { program_id: string; program_name: string; program_type: string }
interface RawEffectiveInterv { intervention_id: string; intervention_type: string; status: string; priority: string; created_at: string; resolved_at: string | null; assigned_user: { full_name: string } | null; intervention_outcomes: Array<{ effectiveness: number | null; risk_before: string | null; risk_after: string | null; score_before: number | null; score_after: number | null }> }
interface RawBaseline    { learner_id: string; maths_confidence: number; science_confidence: number; digital_confidence: number }

async function getReportData() {
  const supabase = await createClient();

  const [
    learnersRes, schoolsRes, programsRes,
    attendanceRes, assessmentsRes, projectsRes,
    interventionsRes, sponsorsRes,
    effectiveIntervRes, baselinesRes, mentorSessionsRes,
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
    // Effectiveness data
    supabase.from('interventions').select(`
      intervention_id, intervention_type, status, priority, created_at, resolved_at,
      assigned_user:users!assigned_to(full_name),
      intervention_outcomes(effectiveness, risk_before, risk_after, score_before, score_after)
    `).order('created_at', { ascending: false }),
    supabase.from('learner_baselines').select('learner_id, maths_confidence, science_confidence, digital_confidence'),
    supabase.from('mentorship_sessions').select('learner_id, session_date'),
  ]);

  return {
    learners:         (learnersRes.data         || []) as unknown as RawLearner[],
    schools:          schoolsRes.data           || [],
    programs:         (programsRes.data         || []) as unknown as RawProgram[],
    attendance:       (attendanceRes.data       || []) as unknown as RawAttendance[],
    assessments:      (assessmentsRes.data      || []) as unknown as RawAssessment[],
    projects:         (projectsRes.data         || []) as unknown as RawProject[],
    interventions:    (interventionsRes.data    || []) as unknown as RawIntervention[],
    sponsors:         (sponsorsRes.data         || []) as unknown as RawSponsor[],
    effectiveIntervs: (effectiveIntervRes.data  || []) as unknown as RawEffectiveInterv[],
    baselines:        (baselinesRes.data        || []) as unknown as RawBaseline[],
    mentorSessions:   (mentorSessionsRes.data   || []) as unknown as { learner_id: string; session_date: string }[],
  };
}

export default async function ReportsPage() {
  await requireAuth(['admin', 'instructor']);
  const data = await getReportData();

  // ── KPI aggregates ──────────────────────────────────────────────────────────
  const totalLearners  = data.learners.length;
  const activeLearners = data.learners.filter(l => l.programme_status === 'active').length;
  const totalAtt       = data.attendance.length;
  const presentAtt     = data.attendance.filter(a => a.status === 'present').length;
  const overallAttRate = totalAtt ? Math.round(presentAtt / totalAtt * 100) : 0;
  const totalAss       = data.assessments.length;
  const avgScore       = totalAss
    ? Math.round(data.assessments.reduce((s, a) => s + Number(a.percentage || 0), 0) / totalAss)
    : 0;
  const completedProj  = data.projects.filter(p => p.completion_status === 'completed').length;
  const highRisk       = data.learners.filter(l => l.risk_scores?.risk_level === 'high').length;
  const openInterv     = data.interventions.filter(i => i.status === 'open').length;

  // ── School breakdown ────────────────────────────────────────────────────────
  const schoolMap: Record<string, { name: string; count: number; att: number; score: number }> = {};
  data.learners.forEach(l => {
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
  data.learners.forEach(l => {
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
  data.programs.forEach(p => {
    progMap[p.program_id] = { name: p.program_name, type: p.program_type, learners: 0, att: 0, assCount: 0, avgScore: 0 };
  });
  data.assessments.forEach(a => {
    if (a.program_id && progMap[a.program_id]) {
      progMap[a.program_id].assCount++;
      progMap[a.program_id].avgScore += Number(a.percentage || 0);
    }
  });
  const programmeBreakdown = Object.values(progMap).map(p => ({
    ...p,
    avgScore: p.assCount ? Math.round(p.avgScore / p.assCount) : 0,
  })).sort((a, b) => b.learners - a.learners);

  // ── Enrolment year breakdown ────────────────────────────────────────────────
  const yearMap: Record<string, { count: number; att: number; score: number; high: number; medium: number; low: number }> = {};
  data.learners.filter(l => l.programme_status === 'active').forEach(l => {
    const yr = l.enrollment_date ? new Date(l.enrollment_date).getFullYear().toString() : 'Unknown';
    if (!yearMap[yr]) yearMap[yr] = { count: 0, att: 0, score: 0, high: 0, medium: 0, low: 0 };
    yearMap[yr].count++;
    const r = l.risk_scores;
    if (r) {
      yearMap[yr].att   += r.attendance_rate || 0;
      yearMap[yr].score += r.avg_score || 0;
      if (r.risk_level === 'high')        yearMap[yr].high++;
      else if (r.risk_level === 'medium') yearMap[yr].medium++;
      else                                yearMap[yr].low++;
    }
  });
  const yearBreakdown = Object.entries(yearMap)
    .map(([year, s]) => ({
      year,
      count:  s.count,
      att:    s.count ? Math.round(s.att   / s.count) : 0,
      score:  s.count ? Math.round(s.score / s.count) : 0,
      high:   s.high,
      medium: s.medium,
      low:    s.low,
    }))
    .sort((a, b) => a.year.localeCompare(b.year));

  // ── Sponsor breakdown ───────────────────────────────────────────────────────
  const sponsorBreakdown = data.sponsors.map(s => ({
    name:  s.sponsor_name,
    count: s.sponsor_learners?.length || 0,
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  // ── Score distribution by grade band ───────────────────────────────────────
  const bandMap: Record<string, number> = {
    Distinction: 0, Merit: 0, Pass: 0, 'Needs Support': 0,
  };
  data.assessments.forEach(a => {
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

      {(() => {
        // ── Effectiveness: intervention type breakdown ─────────────────────
        const typeMap: Record<string, { type: string; total: number; resolved: number; ratings: number[]; riskImproved: number }> = {};
        data.effectiveIntervs.forEach(i => {
          const t = i.intervention_type || 'other';
          if (!typeMap[t]) typeMap[t] = { type: t, total: 0, resolved: 0, ratings: [], riskImproved: 0 };
          typeMap[t].total++;
          if (i.status === 'resolved') typeMap[t].resolved++;
          const o = i.intervention_outcomes?.[0];
          if (o?.effectiveness != null) typeMap[t].ratings.push(o.effectiveness);
          const RISK_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };
          if (o?.risk_before && o?.risk_after && RISK_ORDER[o.risk_after] < RISK_ORDER[o.risk_before]) typeMap[t].riskImproved++;
        });
        const interventionByType = Object.values(typeMap).map(t => ({
          type:         t.type,
          total:        t.total,
          resolved:     t.resolved,
          resRate:      t.total > 0 ? Math.round(t.resolved / t.total * 100) : 0,
          avgRating:    t.ratings.length > 0 ? Math.round(t.ratings.reduce((a,b) => a+b, 0) / t.ratings.length * 10) / 10 : null,
          riskImproved: t.riskImproved,
        })).sort((a, b) => b.resRate - a.resRate);

        // ── Effectiveness: staff performance ─────────────────────────────
        const staffMap: Record<string, { name: string; total: number; resolved: number; ratings: number[] }> = {};
        data.effectiveIntervs.forEach(i => {
          const name = i.assigned_user?.full_name ?? 'Unassigned';
          if (!staffMap[name]) staffMap[name] = { name, total: 0, resolved: 0, ratings: [] };
          staffMap[name].total++;
          if (i.status === 'resolved') staffMap[name].resolved++;
          const o = i.intervention_outcomes?.[0];
          if (o?.effectiveness != null) staffMap[name].ratings.push(o.effectiveness);
        });
        const staffPerformance = Object.values(staffMap).filter(s => s.name !== 'Unassigned').map(s => ({
          name:      s.name,
          total:     s.total,
          resolved:  s.resolved,
          resRate:   s.total > 0 ? Math.round(s.resolved / s.total * 100) : 0,
          avgRating: s.ratings.length > 0 ? Math.round(s.ratings.reduce((a,b) => a+b, 0) / s.ratings.length * 10) / 10 : null,
        })).sort((a, b) => b.resolved - a.resolved).slice(0, 10);

        // ── Value-add: baseline confidence vs current score ───────────────
        const riskMap = Object.fromEntries(data.learners.map(l => [l.learner_id, l.risk_scores]));
        const valueAdd = data.baselines.map(b => {
          const avgConf = Math.round((b.maths_confidence + b.science_confidence + b.digital_confidence) / 3 * 20);
          const curScore = riskMap[b.learner_id]?.avg_score ?? null;
          return { learner_id: b.learner_id, baseline_pct: avgConf, current_pct: curScore };
        }).filter(v => v.current_pct != null);
        const improved  = valueAdd.filter(v => (v.current_pct ?? 0) > v.baseline_pct).length;
        const declined  = valueAdd.filter(v => (v.current_pct ?? 0) < v.baseline_pct).length;
        const avgGain   = valueAdd.length > 0 ? Math.round(valueAdd.reduce((s, v) => s + ((v.current_pct ?? 0) - v.baseline_pct), 0) / valueAdd.length) : 0;

        // ── Mentorship impact: 3+ sessions vs fewer ───────────────────────
        const sessionCountMap: Record<string, number> = {};
        data.mentorSessions.forEach(s => { sessionCountMap[s.learner_id] = (sessionCountMap[s.learner_id] ?? 0) + 1; });
        const withMentor    = data.learners.filter(l => (sessionCountMap[l.learner_id] ?? 0) >= 3 && l.risk_scores);
        const withoutMentor = data.learners.filter(l => (sessionCountMap[l.learner_id] ?? 0) < 3  && l.risk_scores);
        const mentorHighRisk = withMentor.length    > 0 ? Math.round(withMentor.filter(l => l.risk_scores?.risk_level === 'high').length / withMentor.length * 100) : 0;
        const noMentorHighRisk = withoutMentor.length > 0 ? Math.round(withoutMentor.filter(l => l.risk_scores?.risk_level === 'high').length / withoutMentor.length * 100) : 0;
        const mentorAvgScore = withMentor.length > 0    ? Math.round(withMentor.reduce((s, l) => s + (l.risk_scores?.avg_score ?? 0), 0) / withMentor.length) : 0;
        const noMentorAvgScore = withoutMentor.length > 0 ? Math.round(withoutMentor.reduce((s, l) => s + (l.risk_scores?.avg_score ?? 0), 0) / withoutMentor.length) : 0;

        const effectivenessData = {
          interventionByType,
          staffPerformance,
          valueAdd: { count: valueAdd.length, improved, declined, avgGain },
          mentorship: {
            withMentorCount: withMentor.length, withoutMentorCount: withoutMentor.length,
            mentorHighRisk, noMentorHighRisk, mentorAvgScore, noMentorAvgScore,
          },
        };

        return (
          <ReportsClient
            schoolBreakdown={schoolBreakdown}
            gradeBreakdown={gradeBreakdown}
            programmeBreakdown={programmeBreakdown}
            sponsorBreakdown={sponsorBreakdown}
            yearBreakdown={yearBreakdown}
            scoreDist={scoreDist}
            rawLearners={data.learners}
            rawAttendance={data.attendance}
            rawAssessments={data.assessments}
            rawProjects={data.projects}
            rawInterventions={data.interventions}
            effectivenessData={effectivenessData}
          />
        );
      })()}
    </div>
  );
}
