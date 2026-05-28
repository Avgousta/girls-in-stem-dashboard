import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { StatusBadge, RiskBadge, GradeBadge } from '@/components/ui/Badge';
import { fmt } from '@/utils';
import { CalendarCheck2, BarChart3, BookOpen, AlertTriangle, HeartHandshake, ArrowLeft, Pencil, FileText } from 'lucide-react';
import Link from 'next/link';

async function getLearnerProfile(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('learners')
    .select(`
      *,
      learner_profiles(*),
      schools(school_name, district, province),
      risk_scores(*),
      program_enrollments(*, programs(program_name, program_type)),
      attendance(status, session_date, programs(program_name)),
      assessments(subject, score, max_score, percentage, grade_band, assessment_date, programs(program_name)),
      mentorship_sessions(session_date, duration_minutes, notes, next_steps, users!mentor_id(full_name)),
      interventions(reason, action_taken, follow_up_date, status, created_at),
      projects(project_id, project_name, stage, completion_status, score, max_score, due_date,
        programs(program_name),
        project_feedback(feedback_id, body, is_private, created_at, users!author_id(full_name, role)))
    `)
    .eq('learner_id', id)
    .single();
  return data;
}

interface Props { params: Promise<{ id: string }> }

export default async function LearnerProfilePage({ params }: Props) {
  await requireAuth(['admin', 'instructor']);
  const { id } = await params;
  const learner = await getLearnerProfile(id);
  if (!learner) notFound();

  const profile   = learner.learner_profiles;
  const risk      = learner.risk_scores;
  const programs  = learner.program_enrollments || [];
  const attendance= learner.attendance || [];
  const assessments = learner.assessments || [];
  const mentorship  = learner.mentorship_sessions || [];
  const interventions = learner.interventions || [];
  const projects    = (learner as any).projects || [];

  const attRate = attendance.length
    ? Math.round(attendance.filter((a: any) => a.status === 'present').length / attendance.length * 100)
    : 0;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <Link href="/learners" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Learners
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-brand-800 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </h1>
              <StatusBadge label={learner.programme_status} />
              {risk && <RiskBadge level={risk.risk_level} />}
            </div>
            <p className="text-gray-500 mt-1 font-mono text-sm">{learner.learner_code}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span>🏫 {(learner.schools as any)?.school_name}</span>
              <span>📚 Grade {learner.grade}</span>
              <span>📅 Enrolled {fmt.date(learner.enrollment_date)}</span>
              {profile?.email && <span>✉ {profile.email}</span>}
              {profile?.parent_name && <span>👨‍👩‍👧 {profile.parent_name}</span>}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href={`/learners/${learner.learner_id}/edit`} className="btn-primary text-xs">
              <Pencil className="w-3.5 h-3.5" /> Edit Learner
            </Link>
            <a href={`/api/v1/reports/learner/${learner.learner_id}`} target="_blank"
              className="btn-secondary text-xs flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Print Report
            </a>
            <Link href={`/interventions/new?learner=${learner.learner_id}`} className="btn-secondary text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Log Intervention
            </Link>
            <Link href={`/mentorship/new?learner=${learner.learner_id}`} className="btn-secondary text-xs">
              <HeartHandshake className="w-3.5 h-3.5" /> Log Mentorship
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Attendance Rate', value: `${attRate}%`, icon: CalendarCheck2, color: attRate >= 75 ? 'text-mint-600' : 'text-red-600' },
          { label: 'Avg Score', value: risk ? `${risk.avg_score}%` : '—', icon: BarChart3, color: (risk?.avg_score||0) >= 60 ? 'text-mint-600' : 'text-red-600' },
          { label: 'Programs', value: programs.length, icon: BookOpen, color: 'text-brand-700' },
          { label: 'Interventions', value: interventions.length, icon: AlertTriangle, color: interventions.length > 0 ? 'text-red-600' : 'text-gray-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Programmes */}
      {programs.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-700" /> Enrolled Programmes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {programs.map((e: any, i: number) => (
              <div key={e.enrollment_id || i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{e.programs?.program_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{e.programs?.program_type}</p>
                  </div>
                  <StatusBadge label={e.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Assessments */}
      {assessments.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-700" /> Recent Assessments
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr key="header">
                  {['Date','Subject','Score','%','Grade'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {assessments.slice(0, 10).map((a: any, i: number) => (
                  <tr key={a.assessment_id || i}>
                    <td key="date" className="text-xs text-gray-400">{fmt.date(a.assessment_date)}</td>
                    <td key="subject" className="font-medium">{a.subject}</td>
                    <td key="score" className="font-mono text-sm">{a.score}/{a.max_score}</td>
                    <td key="pct" className={`font-mono font-semibold ${a.percentage < 50 ? 'text-red-600' : a.percentage < 60 ? 'text-yellow-600' : 'text-mint-600'}`}>
                      {a.percentage}%
                    </td>
                    <td key="grade">{a.grade_band && <GradeBadge grade={a.grade_band} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Interventions */}
      {interventions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Interventions
          </h2>
          <div className="space-y-3">
            {interventions.map((intv: any, i: number) => (
              <div key={intv.intervention_id || i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{intv.reason}</p>
                    {intv.action_taken && <p className="text-xs text-gray-500 mt-1">{intv.action_taken}</p>}
                    {intv.follow_up_date && (
                      <p className="text-xs text-gray-400 mt-1">Follow-up: {fmt.date(intv.follow_up_date)}</p>
                    )}
                  </div>
                  <StatusBadge label={intv.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📁</span> Projects ({projects.length})
          </h2>
          <div className="space-y-3">
            {projects.map((p: any, i: number) => {
              const pct = p.score != null ? Math.round((p.score / (p.max_score || 100)) * 100) : null;
              const STAGE_COLORS: Record<string, string> = {
                planning: 'bg-gray-100 text-gray-600',
                in_progress: 'bg-yellow-50 text-yellow-700',
                review: 'bg-purple-50 text-purple-700',
                submitted: 'bg-blue-50 text-blue-700',
                marked: 'bg-mint-400/10 text-mint-700',
              };
              const stageKey = p.stage || 'planning';
              const publicFeedback = (p.project_feedback || []).filter((f: any) => !f.is_private);
              return (
                <div key={p.project_id || i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/projects/${p.project_id}`}
                          className="font-semibold text-gray-800 hover:text-brand-700 hover:underline">
                          {p.project_name}
                        </Link>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STAGE_COLORS[stageKey] || 'bg-gray-100 text-gray-600'}`}>
                          {stageKey.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.programs?.program_name}</p>
                    </div>
                    {pct !== null && (
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${pct >= 75 ? 'text-mint-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  {publicFeedback.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1.5">💬 {publicFeedback.length} feedback comment{publicFeedback.length !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
                        "{publicFeedback[publicFeedback.length - 1].body}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
