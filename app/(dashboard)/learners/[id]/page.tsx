import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
import {
  CalendarCheck2, BarChart3, BookOpen, AlertTriangle,
  HeartHandshake, ArrowLeft, Pencil, FileText, FolderKanban,
} from 'lucide-react';
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
      assessments(assessment_id, subject, score, max_score, percentage, grade_band, assessment_date, programs(program_name)),
      mentorship_sessions(session_id, session_date, duration_minutes, notes, next_steps, users!mentor_id(full_name)),
      interventions(intervention_id, reason, action_taken, follow_up_date, status, priority, created_at),
      projects(project_id, project_name, stage, completion_status, score, max_score, due_date,
        programs(program_name),
        project_feedback(feedback_id, body, is_private, created_at, users!author_id(full_name, role)))
    `)
    .eq('learner_id', id)
    .single();
  return data;
}

interface Props { params: Promise<{ id: string }> }

// ─── Small reusable bits ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconColor, count, children }: {
  title: string; icon: any; iconColor: string; count?: number; children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3"
        style={{ color: DS.textMid }}>
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        {title}
        {count != null && (
          <span className="text-xs font-black px-2 py-0.5 rounded-full ml-1"
            style={{ background: DS.surfaceHover, color: DS.textMuted }}>{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl p-5 text-center" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: DS.textMuted }}>{label}</p>
    </div>
  );
}

const GRADE_COLOR: Record<string, string> = {
  Distinction:    '#818CF8',
  Merit:          'var(--ds-success)',
  Pass:           'var(--ds-warn)',
  'Needs Support':'var(--ds-danger)',
};

const STAGE_CFG: Record<string, { color: string; bg: string }> = {
  planning:    { color: DS.textMuted as string, bg: DS.surfaceHover as string },
  in_progress: { color: 'var(--ds-warn)',        bg: 'var(--ds-warn-light)'    },
  review:      { color: '#818CF8',               bg: 'rgba(129,140,248,0.15)' },
  submitted:   { color: 'var(--ds-purple)',       bg: 'var(--ds-purple-light)' },
  marked:      { color: 'var(--ds-success)',      bg: 'var(--ds-success-light)'},
};

export default async function LearnerProfilePage({ params }: Props) {
  await requireAuth(['admin', 'instructor']);
  const { id } = await params;
  const learner = await getLearnerProfile(id);
  if (!learner) notFound();

  const profile      = learner.learner_profiles;
  const risk         = learner.risk_scores;
  const programs     = learner.program_enrollments || [];
  const attendance   = learner.attendance          || [];
  const assessments  = (learner.assessments || []).sort((a: any, b: any) => b.assessment_date?.localeCompare(a.assessment_date ?? '') ?? 0);
  const mentorship   = learner.mentorship_sessions || [];
  const interventions = learner.interventions      || [];
  const projects     = (learner as any).projects   || [];

  const attRate = attendance.length
    ? Math.round(attendance.filter((a: any) => a.status === 'present').length / attendance.length * 100)
    : 0;

  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`;

  const riskColorMap: Record<string, string> = { high: 'var(--ds-danger)', medium: 'var(--ds-warn)', low: 'var(--ds-success)' };
  const riskColor = riskColorMap[risk?.risk_level ?? 'low'] ?? 'var(--ds-success)';

  return (
    <div className="max-w-5xl space-y-6 pb-20">

      {/* Back */}
      <Link href="/learners"
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        style={{ color: DS.textMuted }}>
        <ArrowLeft className="w-4 h-4" /> Back to Learners
      </Link>

      {/* Profile card */}
      <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0"
            style={{ background: `linear-gradient(135deg, ${DS.primary}, #6D28D9)` }}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: DS.text }}>
                {profile?.first_name} {profile?.last_name}
              </h1>
              {/* Status pill */}
              <span className="text-xs font-bold px-2.5 py-1 rounded-full capitalize"
                style={{
                  background: learner.programme_status === 'active' ? 'var(--ds-success-light)' : DS.surfaceHover,
                  color:      learner.programme_status === 'active' ? 'var(--ds-success)'       : DS.textMuted,
                }}>
                {learner.programme_status}
              </span>
              {/* Risk pill */}
              {risk && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase"
                  style={{ background: `${riskColor}20`, color: riskColor }}>
                  {risk.risk_level} risk
                </span>
              )}
            </div>
            <p className="font-mono text-sm mt-1" style={{ color: DS.textMuted }}>{learner.learner_code}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm" style={{ color: DS.textMid }}>
              {(learner.schools as any)?.school_name && <span>🏫 {(learner.schools as any).school_name}</span>}
              {learner.grade  && <span>📚 Grade {learner.grade}</span>}
              {learner.enrollment_date && <span>📅 Enrolled {fmt.date(learner.enrollment_date)}</span>}
              {profile?.email       && <span>✉ {profile.email}</span>}
              {profile?.parent_name && <span>👨‍👩‍👧 {profile.parent_name}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Link href={`/learners/${learner.learner_id}/edit`} className="btn-primary text-xs">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
            <a href={`/api/v1/reports/learner/${learner.learner_id}`} target="_blank"
              className="btn-secondary text-xs flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Report
            </a>
            <Link href={`/interventions/new?learner=${learner.learner_id}`} className="btn-secondary text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Intervene
            </Link>
            <Link href={`/mentorship/new?learner=${learner.learner_id}`} className="btn-secondary text-xs">
              <HeartHandshake className="w-3.5 h-3.5" /> Mentor
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Attendance Rate"  value={`${attRate}%`}          color={attRate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)'}          />
        <StatCard label="Avg Score"        value={risk ? `${Math.round(risk.avg_score ?? 0)}%` : '—'} color={(risk?.avg_score ?? 0) >= 60 ? 'var(--ds-success)' : 'var(--ds-danger)'} />
        <StatCard label="Programmes"       value={programs.length}         color={DS.primary}                                                          />
        <StatCard label="Interventions"    value={interventions.length}    color={interventions.length > 0 ? 'var(--ds-danger)' : DS.textMuted as string} />
      </div>

      {/* Enrolled programmes */}
      {programs.length > 0 && (
        <Section title="Enrolled Programmes" icon={BookOpen} iconColor={DS.primary} count={programs.length}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {programs.map((e: any, i: number) => (
              <div key={e.enrollment_id || i} className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: DS.text }}>{e.programs?.program_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{e.programs?.program_type}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                  style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Assessments */}
      {assessments.length > 0 && (
        <Section title="Assessments" icon={BarChart3} iconColor={DS.primary} count={assessments.length}>
          <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string }}>
                  {['Date','Subject','Score','%','Grade Band'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: DS.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assessments.slice(0, 10).map((a: any, i: number) => {
                  const bandColor = GRADE_COLOR[a.grade_band] ?? DS.textMid;
                  return (
                    <tr key={a.assessment_id || i} style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                      <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{fmt.date(a.assessment_date)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>{a.subject}</td>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: DS.textMid }}>{a.score}/{a.max_score}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold tabular-nums"
                          style={{ color: a.percentage < 50 ? 'var(--ds-danger)' : a.percentage < 60 ? 'var(--ds-warn)' : 'var(--ds-success)' }}>
                          {a.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.grade_band && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${bandColor}20`, color: bandColor }}>
                            {a.grade_band}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Mentorship sessions */}
      {mentorship.length > 0 && (
        <Section title="Mentorship Sessions" icon={HeartHandshake} iconColor="#A78BFA" count={mentorship.length}>
          <div className="space-y-2">
            {mentorship.slice(0, 5).map((s: any, i: number) => (
              <div key={s.session_id || i} className="rounded-xl p-4"
                style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: DS.text }}>
                      {fmt.date(s.session_date)}
                      {s.duration_minutes && <span className="ml-2 text-xs font-normal" style={{ color: DS.textMuted }}>· {s.duration_minutes}m</span>}
                    </p>
                    {s.users?.full_name && (
                      <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>🧑‍🏫 {s.users.full_name}</p>
                    )}
                  </div>
                </div>
                {s.next_steps && (
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: DS.textMid }}>
                    <span className="font-semibold" style={{ color: DS.textMuted }}>Next steps: </span>
                    {s.next_steps}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Interventions */}
      {interventions.length > 0 && (
        <Section title="Interventions" icon={AlertTriangle} iconColor="var(--ds-danger)" count={interventions.length}>
          <div className="space-y-2">
            {interventions.map((intv: any, i: number) => {
              const isCrit = intv.priority === 'critical' || intv.priority === 'high';
              return (
                <div key={intv.intervention_id || i} className="rounded-xl p-4"
                  style={{
                    background: DS.surface,
                    border:     `1px solid ${isCrit ? 'var(--ds-danger)' : DS.border}`,
                    borderLeft: `4px solid ${isCrit ? 'var(--ds-danger)' : 'var(--ds-warn)'}`,
                  }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: DS.text }}>{intv.reason}</p>
                      {intv.action_taken && (
                        <p className="text-xs mt-1" style={{ color: DS.textMid }}>{intv.action_taken}</p>
                      )}
                      <p className="text-xs mt-1" style={{ color: DS.textMuted }}>{fmt.date(intv.created_at)}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0"
                      style={{
                        background: intv.status === 'resolved' ? 'var(--ds-success-light)' : 'var(--ds-danger-light)',
                        color:      intv.status === 'resolved' ? 'var(--ds-success)'       : 'var(--ds-danger)',
                      }}>
                      {intv.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Section title="Projects" icon={FolderKanban} iconColor="#818CF8" count={projects.length}>
          <div className="space-y-3">
            {projects.map((p: any, i: number) => {
              const pct      = p.score != null ? Math.round((p.score / (p.max_score || 100)) * 100) : null;
              const stageCfg = STAGE_CFG[p.stage ?? 'planning'] ?? STAGE_CFG.planning;
              const publicFeedback = (p.project_feedback || []).filter((f: any) => !f.is_private);
              return (
                <div key={p.project_id || i} className="rounded-2xl p-4"
                  style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/projects/${p.project_id}`}
                          className="font-semibold hover:underline" style={{ color: DS.text }}>
                          {p.project_name}
                        </Link>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: stageCfg.bg, color: stageCfg.color }}>
                          {(p.stage ?? 'planning').replace(/_/g, ' ')}
                        </span>
                      </div>
                      {p.programs?.program_name && (
                        <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{p.programs.program_name}</p>
                      )}
                    </div>
                    {pct !== null && (
                      <span className="text-sm font-bold tabular-nums shrink-0"
                        style={{ color: pct >= 75 ? 'var(--ds-success)' : pct >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)' }}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  {publicFeedback.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
                      <p className="text-xs mb-1.5" style={{ color: DS.textMuted }}>
                        💬 {publicFeedback.length} feedback comment{publicFeedback.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs leading-relaxed px-3 py-2 rounded-lg line-clamp-2"
                        style={{ background: DS.surfaceHover, color: DS.textMid }}>
                        "{publicFeedback[publicFeedback.length - 1].body}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
