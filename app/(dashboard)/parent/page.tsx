import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
import { CalendarCheck2, BarChart3, FolderKanban, Bell, FileText, AlertTriangle } from 'lucide-react';

interface ChildLearner {
  learner_id: string; learner_code: string; grade: number; programme_status: string;
  learner_profiles: { first_name: string; last_name: string; email: string | null } | null;
  schools: { school_name: string } | null;
  risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null;
  program_enrollments: Array<{ programs: { program_name: string; program_type: string } | null }>;
  attendance: Array<{ status: string; session_date: string }>;
  assessments: Array<{ subject: string; percentage: number | null; grade_band: string | null; assessment_date: string; score: number | null; max_score: number | null; notes: string | null }>;
  projects: Array<{ project_name: string; stage: string | null; completion_status: string; score: number | null; max_score: number | null }>;
  interventions: Array<{ reason: string; status: string; created_at: string }>;
}
interface Notification { notification_id: string; title: string; body: string; type: string; created_at: string }

export default async function ParentPage() {
  const user     = await requireAuth(['parent']);
  const supabase = await createClient();

  const { data: children } = await supabase
    .from('learners')
    .select(`
      learner_id, learner_code, grade, programme_status,
      learner_profiles(first_name, last_name, email),
      schools(school_name),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(programs(program_name, program_type)),
      attendance(status, session_date),
      assessments(subject, percentage, grade_band, assessment_date, score, max_score, notes),
      projects(project_name, stage, completion_status, score, max_score),
      interventions(reason, status, created_at)
    `)
    .eq('parent_id', user.user_id);

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.user_id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5);

  const kids   = (children || []) as unknown as ChildLearner[];
  const notifs = (notifications || []) as unknown as Notification[];

  const scoreColor = (v: number) =>
    v >= 80 ? '#818CF8' : v >= 70 ? 'var(--ds-success)' : v >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)';
  const bandColor  = (b: string) => ({
    Distinction: '#818CF8', Merit: 'var(--ds-success)',
    Pass: 'var(--ds-warn)', 'Needs Support': 'var(--ds-danger)',
  }[b] ?? DS.textMuted);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: DS.text }}>Parent Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
            Tracking {kids.length} learner{kids.length !== 1 ? 's' : ''}
          </p>
        </div>
        {notifs.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
            <Bell className="w-4 h-4" style={{ color: 'var(--ds-warn)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ds-warn)' }}>
              {notifs.length} new notification{notifs.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* No children linked */}
      {kids.length === 0 ? (
        <div className="text-center py-20 rounded-2xl"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <p className="text-sm font-medium" style={{ color: DS.textMuted }}>
            No learners linked to your account yet.
          </p>
          <p className="text-xs mt-1" style={{ color: DS.textMuted }}>
            Contact the programme administrator to link your child.
          </p>
        </div>
      ) : kids.map(child => {
        const profile   = child.learner_profiles;
        const risk      = child.risk_scores;
        const att       = child.attendance || [];
        const ass       = [...(child.assessments || [])].sort((a, b) => b.assessment_date?.localeCompare(a.assessment_date));
        const projects  = child.projects || [];
        const progs     = child.program_enrollments || [];
        const attRate   = att.length ? Math.floor(att.filter(a => a.status === 'present').length / att.length * 100) : 0;
        const avgScore  = ass.length ? Math.round(ass.reduce((s, a) => s + Number(a.percentage || 0), 0) / ass.length) : null;
        const initials  = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();
        const riskColorMap: Record<string, string> = { high: 'var(--ds-danger)', medium: 'var(--ds-warn)', low: 'var(--ds-success)' };
        const riskColor = riskColorMap[risk?.risk_level ?? 'low'] ?? 'var(--ds-success)';

        return (
          <div key={child.learner_id} className="rounded-2xl overflow-hidden"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>

            {/* Child header */}
            <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: `linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #312E81 100%)` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {child.learner_code} · Grade {child.grade} · {child.schools?.school_name}
                  </p>
                  {risk && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full mt-1.5 inline-block"
                      style={{ background: `${riskColor}25`, color: riskColor, border: `1px solid ${riskColor}` }}>
                      {risk.risk_level?.toUpperCase()} RISK
                    </span>
                  )}
                </div>
              </div>
              <a href={`/api/v1/reports/learner/${child.learner_id}`} target="_blank"
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                <FileText className="w-3.5 h-3.5" /> Report Card
              </a>
            </div>

            <div className="p-6 space-y-6">

              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Attendance',      value: `${attRate}%`,           color: attRate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)',  icon: CalendarCheck2, warn: attRate < 75 },
                  { label: 'Avg Score',       value: avgScore !== null ? `${avgScore}%` : '—', color: avgScore !== null ? scoreColor(avgScore) : DS.textMuted as string, icon: BarChart3,       warn: avgScore !== null && avgScore < 50 },
                  { label: 'Active Projects', value: projects.filter(p => !['marked','completed'].includes(p.stage||'')).length, color: DS.primary as string, icon: FolderKanban, warn: false },
                  { label: 'Programmes',      value: progs.length,            color: DS.primary as string, icon: FolderKanban, warn: false },
                ].map(({ label, value, color, icon: Icon, warn }) => (
                  <div key={label} className="rounded-xl p-4 text-center"
                    style={{ background: DS.surfaceHover, border: `1px solid ${warn ? 'var(--ds-danger)' : DS.border}` }}>
                    <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
                    <p className="text-xl font-bold tabular-nums" style={{ color }}>{String(value)}</p>
                    <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{label}</p>
                    {warn && <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--ds-danger)' }}>⚠ Needs attention</p>}
                  </div>
                ))}
              </div>

              {/* Programmes */}
              {progs.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>Programmes</h3>
                  <div className="flex flex-wrap gap-2">
                    {progs.map((e, i) => (
                      <span key={i} className="text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
                        {e.programs?.program_name}
                        {e.programs?.program_type && <span style={{ color: DS.textMuted }}> · {e.programs.program_type}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent assessments */}
              {ass.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>Recent Results</h3>
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: DS.surfaceHover, borderBottom: `1px solid ${DS.border}` }}>
                          {['Date','Subject','Score','Grade'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: DS.textMuted }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ass.slice(0, 5).map((a, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                            <td className="px-3 py-2 text-xs" style={{ color: DS.textMuted }}>{fmt.date(a.assessment_date)}</td>
                            <td className="px-3 py-2 font-medium text-xs" style={{ color: DS.text }}>{a.subject}</td>
                            <td className="px-3 py-2 font-mono font-bold text-xs" style={{ color: scoreColor(Number(a.percentage || 0)) }}>
                              {a.score}/{a.max_score} ({a.percentage}%)
                            </td>
                            <td className="px-3 py-2">
                              {a.grade_band && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ color: bandColor(a.grade_band), background: `${bandColor(a.grade_band)}20` }}>
                                  {a.grade_band}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent attendance */}
              {att.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>
                    Recent Attendance
                    <span className="ml-2 font-semibold normal-case"
                      style={{ color: attRate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)' }}>
                      {attRate}% overall
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {[...att]
                      .sort((a, b) => b.session_date?.localeCompare(a.session_date))
                      .slice(0, 12)
                      .map((a, i) => {
                        const cfg: Record<string, { color: string; bg: string }> = {
                          present: { color: 'var(--ds-success)', bg: 'var(--ds-success-light)' },
                          absent:  { color: 'var(--ds-danger)',  bg: 'var(--ds-danger-light)'  },
                          late:    { color: 'var(--ds-warn)',    bg: 'var(--ds-warn-light)'    },
                          excused: { color: '#818CF8',           bg: 'rgba(129,140,248,0.15)'  },
                        };
                        const c = cfg[a.status] ?? { color: DS.textMuted as string, bg: DS.surfaceHover as string };
                        return (
                          <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg"
                            style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}40` }}>
                            {fmt.date(a.session_date)} · {a.status}
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Open interventions warning */}
              {child.interventions?.filter(i => i.status !== 'resolved').length > 0 && (
                <div className="rounded-xl p-4 flex items-start gap-3"
                  style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--ds-warn)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ds-warn)' }}>Programme Support Note</p>
                    <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
                      Your child&apos;s programme coordinator has flagged a concern. Please contact the programme office.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Unread notifications */}
      {notifs.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: DS.text }}>
            <Bell className="w-4 h-4" style={{ color: 'var(--ds-warn)' }} /> New Notifications
          </h3>
          {notifs.map(n => (
            <div key={n.notification_id} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
              <span className="text-xl shrink-0">
                {n.type === 'absence' ? '🚫' : n.type === 'low_score' ? '📉' : '🔔'}
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: DS.text }}>{n.title}</p>
                <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{n.body}</p>
                <p className="text-xs mt-1" style={{ color: DS.textMuted }}>{fmt.date(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
