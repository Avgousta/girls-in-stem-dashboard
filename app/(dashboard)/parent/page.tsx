import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge, GradeBadge } from '@/components/ui/Badge';
import { fmt } from '@/utils';
import { CalendarCheck2, BarChart3, FolderKanban, Bell, FileText } from 'lucide-react';

export default async function ParentPage() {
  const user = await requireAuth(['parent']);
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
      assessments(subject, percentage, grade_band, assessment_date, score, max_score),
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

  const kids = children || [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tracking {kids.length} learner{kids.length !== 1 ? 's' : ''}
          </p>
        </div>
        {(notifications || []).length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">
              {notifications!.length} new notification{notifications!.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {kids.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400">No learners linked to your account yet.</p>
          <p className="text-gray-400 text-sm mt-1">Contact the platform administrator.</p>
        </div>
      ) : kids.map((child: any) => {
        const profile   = child.learner_profiles;
        const risk      = child.risk_scores;
        const att       = child.attendance || [];
        const ass       = (child.assessments || []).sort((a: any, b: any) => b.assessment_date?.localeCompare(a.assessment_date));
        const projects  = child.projects || [];
        const progs     = child.program_enrollments || [];
        const attRate   = att.length ? Math.round(att.filter((a: any) => a.status === 'present').length / att.length * 100) : 0;
        const avgScore  = ass.length ? Math.round(ass.reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / ass.length) : 0;
        const activeProj = projects.filter((p: any) => !['marked','completed'].includes(p.stage || '')).length;
        const doneProj   = projects.filter((p: any) => ['marked','completed'].includes(p.stage || '')).length;

        return (
          <div key={child.learner_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Child header */}
            <div className="bg-gradient-to-r from-brand-800 to-brand-700 px-6 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-brand-200 text-sm">
                    {child.learner_code} · Grade {child.grade} · {child.schools?.school_name}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <StatusBadge label={child.programme_status} />
                <a href={`/api/v1/reports/learner/${child.learner_id}`} target="_blank"
                  className="flex items-center gap-1.5 text-xs bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors font-medium">
                  <FileText className="w-3.5 h-3.5" /> Report Card
                </a>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Attendance',     value: `${attRate}%`,  color: attRate >= 75 ? 'text-mint-600' : 'text-red-600',   icon: CalendarCheck2,
                    warn: attRate < 75 ? '⚠ Below 75% minimum' : undefined },
                  { label: 'Avg Score',      value: `${avgScore}%`, color: avgScore >= 60 ? 'text-blue-600' : 'text-red-600',  icon: BarChart3,
                    warn: avgScore < 50 ? '⚠ Needs attention' : undefined },
                  { label: 'Active Projects',value: activeProj,     color: 'text-purple-600', icon: FolderKanban },
                  { label: 'Completed',      value: doneProj,       color: 'text-mint-600',   icon: FolderKanban },
                ].map(({ label, value, color, icon: Icon, warn }) => (
                  <div key={label} className="stat-card text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                    {warn && <p className="text-xs text-red-500 mt-1">{warn}</p>}
                  </div>
                ))}
              </div>

              {/* Programmes */}
              {progs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Programmes</h3>
                  <div className="flex flex-wrap gap-2">
                    {progs.map((e: any, i: number) => (
                      <span key={i} className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-full font-medium">
                        {e.programs?.program_name} · {e.programs?.program_type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent assessments */}
              {ass.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Results</h3>
                  <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full data-table">
                      <thead><tr key="h">
                        <th key="d">Date</th><th key="s">Subject</th>
                        <th key="sc">Score</th><th key="g">Grade</th>
                      </tr></thead>
                      <tbody>
                        {ass.slice(0, 5).map((a: any, i: number) => (
                          <tr key={i}>
                            <td key="d" className="text-xs text-gray-400">{fmt.date(a.assessment_date)}</td>
                            <td key="s" className="font-medium">{a.subject}</td>
                            <td key="sc" className={`font-mono font-bold ${Number(a.percentage) >= 60 ? 'text-mint-600' : 'text-red-600'}`}>
                              {a.percentage}%
                            </td>
                            <td key="g">{a.grade_band && <GradeBadge grade={a.grade_band} />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Projects */}
              {projects.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Projects</h3>
                  <div className="space-y-2">
                    {projects.map((p: any, i: number) => {
                      const pct = p.score != null ? Math.round((p.score / (p.max_score || 100)) * 100) : null;
                      const STAGE_LABELS: Record<string, string> = {
                        planning: 'Planning', in_progress: 'In Progress',
                        review: 'Under Review', submitted: 'Submitted', marked: 'Marked',
                      };
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{p.project_name}</p>
                            <p className="text-xs text-gray-400">{STAGE_LABELS[p.stage] || p.completion_status}</p>
                          </div>
                          {pct !== null && (
                            <span className={`text-sm font-bold tabular-nums ${pct >= 75 ? 'text-mint-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {pct}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent attendance */}
              {att.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Recent Attendance
                    <span className={`ml-2 text-xs font-semibold ${attRate >= 75 ? 'text-mint-600' : 'text-red-600'}`}>
                      ({attRate}% overall)
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {[...att].sort((a: any, b: any) => b.session_date?.localeCompare(a.session_date)).slice(0, 10).map((a: any, i: number) => {
                      const colors: Record<string, string> = {
                        present: 'bg-mint-400/10 text-mint-700 border-mint-400/30',
                        absent:  'bg-red-50 text-red-700 border-red-200',
                        late:    'bg-yellow-50 text-yellow-700 border-yellow-200',
                        excused: 'bg-blue-50 text-blue-700 border-blue-200',
                      };
                      return (
                        <span key={i} className={`text-xs border px-2 py-1 rounded-lg font-medium ${colors[a.status] || ''}`}>
                          {fmt.date(a.session_date)} · {a.status}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Notifications */}
      {(notifications || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" /> New Notifications
          </h3>
          <div className="space-y-2">
            {notifications!.map((n: any) => (
              <div key={n.notification_id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-xl shrink-0">
                  {n.type === 'absence' ? '🚫' : n.type === 'low_score' ? '📉' : '🔔'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmt.date(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
