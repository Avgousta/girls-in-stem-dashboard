import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AssessmentsClient from './AssessmentsClient';
import Link from 'next/link';
import { BarChart3, Plus } from 'lucide-react';

async function getPageData() {
  const supabase = await createClient();

  const [assRes, learnersRes, programsRes] = await Promise.all([
    supabase.from('assessments').select(`
      assessment_id, subject, assessment_type, difficulty, skill_tags, term,
      score, max_score, percentage, grade_band, assessment_date,
      notes, feedback_strengths, feedback_improvements, feedback_actions, weighting,
      learner_id,
      learners!inner(
        learner_id, learner_code, grade,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      programs(program_id, program_name, program_type),
      captured_user:users!captured_by(full_name)
    `).order('assessment_date', { ascending: false }).limit(500),

    supabase.from('learners').select(`
      learner_id, learner_code, grade,
      learner_profiles(first_name, last_name),
      schools(school_name),
      assessments(assessment_id, subject, percentage, grade_band, assessment_date, assessment_type, skill_tags),
      risk_scores(risk_level, avg_score, attendance_rate)
    `).eq('programme_status', 'active').order('learner_code'),

    supabase.from('programs').select('program_id, program_name, program_type').eq('is_active', true).order('program_name'),
  ]);

  const assessments = (assRes.data || []).map((a: any) => ({
    id:          a.assessment_id,
    type:        a.assessment_type || 'test',
    difficulty:  a.difficulty || 'medium',
    skills:      a.skill_tags || [],
    term:        a.term,
    subject:     a.subject,
    score:       Number(a.score),
    max_score:   Number(a.max_score),
    pct:         Number(a.percentage),
    grade:       a.grade_band,
    date:        a.assessment_date,
    notes:       a.notes || '',
    strengths:   a.feedback_strengths || '',
    improvements:a.feedback_improvements || '',
    actions:     a.feedback_actions || '',
    weighting:   Number(a.weighting || 1),
    learner_id:  a.learner_id,
    learner:     `${a.learners?.learner_profiles?.first_name ?? ''} ${a.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    learner_code:a.learners?.learner_code ?? '',
    school:      a.learners?.schools?.school_name ?? '—',
    grade_level: a.learners?.grade ?? '',
    programme:   a.programs?.program_name ?? '—',
    prog_id:     a.programs?.program_id ?? '',
    captured_by: a.captured_user?.full_name ?? '—',
  }));

  // Per-learner analysis
  const learners = (learnersRes.data || []).map((l: any) => {
    const lass = l.assessments || [];
    const avgScore = lass.length ? Math.round(lass.reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / lass.length) : 0;
    const trend    = lass.length >= 3
      ? (() => {
          const sorted = [...lass].sort((a: any, b: any) => a.assessment_date.localeCompare(b.assessment_date));
          const first3 = sorted.slice(0, 3).reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / 3;
          const last3  = sorted.slice(-3).reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / 3;
          if (last3 - first3 >= 5)  return 'up';
          if (first3 - last3 >= 5)  return 'down';
          return 'stable';
        })()
      : 'stable';
    // Skill breakdown
    const skillMap: Record<string, number[]> = {};
    lass.forEach((a: any) => {
      (a.skill_tags || []).forEach((sk: string) => {
        if (!skillMap[sk]) skillMap[sk] = [];
        skillMap[sk].push(Number(a.percentage || 0));
      });
    });
    const skills = Object.entries(skillMap).map(([name, scores]) => ({
      name, avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length), count: scores.length,
    })).sort((a, b) => a.avg - b.avg);
    return {
      id:       l.learner_id,
      code:     l.learner_code,
      name:     `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
      school:   l.schools?.school_name ?? '—',
      grade:    l.grade,
      risk:     l.risk_scores?.risk_level ?? 'low',
      avgScore,
      trend,
      total:    lass.length,
      skills,
      weakest:  skills[0]?.name ?? null,
      strongest:skills[skills.length - 1]?.name ?? null,
    };
  });

  // Platform-wide stats
  const total  = assessments.length;
  const avg    = total ? Math.round(assessments.reduce((s, a) => s + a.pct, 0) / total) : 0;
  const bands: Record<string, number> = { Distinction: 0, Merit: 0, Pass: 0, 'Needs Support': 0 };
  assessments.forEach(a => { if (a.grade && bands[a.grade] !== undefined) bands[a.grade]++; });
  const declining = learners.filter(l => l.trend === 'down' && l.total >= 3).length;
  const atRisk    = learners.filter(l => l.avgScore < 50 && l.total >= 1).length;

  // Subject performance
  const subjectMap: Record<string, number[]> = {};
  assessments.forEach(a => {
    if (!subjectMap[a.subject]) subjectMap[a.subject] = [];
    subjectMap[a.subject].push(a.pct);
  });
  const subjectStats = Object.entries(subjectMap).map(([name, scores]) => ({
    name, avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    count: scores.length,
  })).sort((a, b) => b.count - a.count);

  return { assessments, learners, programs: programsRes.data || [], stats: { total, avg, bands, declining, atRisk }, subjectStats };
}

export default async function AssessmentsPage() {
  const user = await requireAuth(['admin', 'instructor']);
  const data = await getPageData();

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>
            <BarChart3 className="w-6 h-6" style={{ color: 'var(--ds-purple)' }} /> Assessment Intelligence
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>
            {data.stats.total} assessments
            {data.stats.declining > 0 && <> · <span style={{ color: 'var(--ds-danger)' }}>{data.stats.declining} declining</span></>}
            {data.stats.atRisk > 0 && <> · <span style={{ color: 'var(--ds-danger)' }}>{data.stats.atRisk} at risk</span></>}
          </p>
        </div>
        <Link href="/assessments/bulk" className="btn-primary">
          <Plus className="w-4 h-4" /> Capture Marks
        </Link>
      </div>
      <AssessmentsClient {...data} currentUserId={user.user_id} role={user.role} />
    </div>
  );
}
