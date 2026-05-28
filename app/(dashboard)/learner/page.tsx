import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GradeBadge, StatusBadge } from '@/components/ui/Badge';
import { fmt } from '@/utils';
import { CalendarCheck2, BarChart3, FolderKanban, TrendingUp } from 'lucide-react';

async function getLearnerData(userId: string) {
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners')
    .select(`
      *,
      learner_profiles(*),
      schools(school_name),
      risk_scores(*),
      program_enrollments(*, programs(program_name, program_type)),
      attendance(status, session_date, programs(program_name)),
      assessments(subject, score, max_score, percentage, grade_band, assessment_date, programs(program_name))
    `)
    .eq('user_id', userId)
    .single();

  return learner;
}

export default async function LearnerPortalPage() {
  const user = await requireAuth(['learner']);
  const learner = await getLearnerData(user.user_id);

  if (!learner) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg font-medium">No learner profile linked to your account.</p>
      <p className="text-sm mt-1">Please contact your instructor.</p>
    </div>
  );

  const profile    = learner.learner_profiles;
  const attendance = learner.attendance || [];
  const assessments= learner.assessments || [];
  const programs   = learner.program_enrollments || [];
  const risk       = learner.risk_scores;

  const attRate    = attendance.length
    ? Math.round(attendance.filter((a: any) => a.status === 'present').length / attendance.length * 100) : 0;
  const avgScore   = assessments.length
    ? Math.round(assessments.reduce((s: number, a: any) => s + Number(a.percentage), 0) / assessments.length) : 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-brand-800 to-brand-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Hi, {profile?.first_name}! 👋</h1>
            <p className="text-brand-200 text-sm">
              {(learner.schools as any)?.school_name} · Grade {learner.grade} · {learner.learner_code}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Attendance', value: `${attRate}%`, icon: CalendarCheck2,
            color: attRate >= 75 ? 'text-mint-600' : 'text-red-500' },
          { label: 'Avg Score',  value: `${avgScore}%`, icon: BarChart3,
            color: avgScore >= 60 ? 'text-mint-600' : 'text-red-500' },
          { label: 'Programmes', value: programs.length, icon: FolderKanban, color: 'text-brand-700' },
          { label: 'Assessments',value: assessments.length, icon: TrendingUp, color: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Programmes */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">My Programmes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {programs.map((e: any) => (
            <div key={e.enrollment_id} className="bg-white rounded-xl border border-gray-100 p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{e.programs?.program_name}</p>
                <p className="text-xs text-gray-400">{e.programs?.program_type}</p>
              </div>
              <StatusBadge label={e.status} />
            </div>
          ))}
        </div>
      </section>

      {/* Recent assessments */}
      {assessments.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Assessments</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>{['Date','Subject','Score','%','Grade'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {assessments.slice(0, 10).map((a: any, i: number) => (
                  <tr key={i}>
                    <td key="c0" className="text-xs text-gray-400">{fmt.date(a.assessment_date)}</td>
                    <td key="c1" className="font-medium">{a.subject}</td>
                    <td key="c2" className="font-mono text-sm">{a.score}/{a.max_score}</td>
                    <td key="c3" className={`font-mono font-semibold ${Number(a.percentage) < 50 ? 'text-red-600' : Number(a.percentage) < 60 ? 'text-yellow-600' : 'text-mint-600'}`}>
                      {a.percentage}%
                    </td>
                    <td key="c4">{a.grade_band && <GradeBadge grade={a.grade_band} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Attendance log */}
      {attendance.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Attendance Log</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>{['Date','Programme','Status'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {attendance.slice(0, 20).map((a: any, i: number) => (
                  <tr key={i}>
                    <td key="c0" className="text-xs text-gray-400">{fmt.date(a.session_date)}</td>
                    <td key="c1">{(a.programs as any)?.program_name}</td>
                    <td key="c2"><StatusBadge label={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
