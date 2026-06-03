import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DS, KPICard, PageHeader, Card, CardHeader, ProgressBar, scoreColor, ActionButton, StatusBadge } from '@/components/platform/PlatformComponents';

async function getAdminData() {
  const supabase = await createClient();
  const [
    learnersRes, programsRes, attendanceRes, assessmentsRes,
    riskRes, interventionsRes, projectsRes, sponsorsRes, usersRes,
  ] = await Promise.all([
    supabase.from('learners').select('learner_id, programme_status, enrollment_date'),
    supabase.from('programs').select('program_id, program_name, is_active, program_type'),
    supabase.from('attendance').select('status, session_date').order('session_date', { ascending: false }).limit(500),
    supabase.from('assessments').select('percentage, grade_band, assessment_date').order('assessment_date', { ascending: false }).limit(200),
    supabase.from('risk_scores').select('risk_level'),
    supabase.from('interventions').select('status, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('projects').select('stage, completion_status'),
    supabase.from('sponsors').select('sponsor_id, sponsor_name, sponsor_learners(count)'),
    supabase.from('users').select('role, is_active, created_at').order('created_at', { ascending: false }),
  ]);

  const learners      = learnersRes.data      || [];
  const programs      = programsRes.data      || [];
  const attendance    = attendanceRes.data    || [];
  const assessments   = assessmentsRes.data   || [];
  const risks         = riskRes.data          || [];
  const interventions = interventionsRes.data || [];
  const projects      = projectsRes.data      || [];
  const sponsors      = sponsorsRes.data      || [];
  const users         = usersRes.data         || [];

  const activeLearners  = learners.filter(l => l.programme_status === 'active').length;
  const activePrograms  = programs.filter(p => p.is_active).length;
  const presentCount    = attendance.filter(a => a.status === 'present').length;
  const attRate         = attendance.length ? Math.round(presentCount / attendance.length * 100) : 0;
  const avgScore        = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + Number(a.percentage || 0), 0) / assessments.length) : 0;
  const highRisk        = risks.filter(r => r.risk_level === 'high').length;
  const mediumRisk      = risks.filter(r => r.risk_level === 'medium').length;
  const lowRisk         = risks.filter(r => r.risk_level === 'low').length;
  const openInterv      = interventions.filter(i => i.status !== 'resolved').length;
  const completedProj   = projects.filter(p => ['marked','completed'].includes((p as any).stage || (p as any).completion_status || '')).length;
  const instructors     = users.filter(u => u.role === 'instructor' && u.is_active).length;
  const pendingUsers    = users.filter(u => u.role === 'instructor' && !u.is_active).length;

  // Attendance trend — last 8 weeks
  const weekMap: Record<string, { present: number; total: number }> = {};
  attendance.forEach(a => {
    const d = new Date(a.session_date);
    const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1);
    const key = mon.toISOString().slice(0, 10);
    if (!weekMap[key]) weekMap[key] = { present: 0, total: 0 };
    weekMap[key].total++;
    if (a.status === 'present') weekMap[key].present++;
  });
  const attTrend = Object.entries(weekMap).sort(([a],[b]) => a.localeCompare(b)).slice(-8)
    .map(([w, v]) => ({ w: new Date(w).toLocaleDateString('en-ZA',{month:'short',day:'numeric'}), r: v.total ? Math.round(v.present/v.total*100) : 0 }));

  // Grade band distribution
  const bands: Record<string, number> = { Distinction:0, Merit:0, Pass:0, 'Needs Support':0 };
  assessments.forEach(a => { if (a.grade_band && bands[a.grade_band]!==undefined) bands[a.grade_band]++; });

  return {
    activeLearners, activePrograms, attRate, avgScore, highRisk, mediumRisk, lowRisk,
    openInterv, completedProj, instructors, pendingUsers, sponsors: sponsors.length,
    attTrend, bands, totalAssessments: assessments.length, totalProjects: projects.length,
    recentInterventions: interventions.slice(0,5),
  };
}

export default async function AdminDashboard() {
  await requireAuth(['admin', 'instructor']);
  const d = await getAdminData();
  const today = new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' });

  return (
    <div className="space-y-8" style={{ color: DS.text }}>

      <PageHeader
        eyebrow="Admin Dashboard"
        title="Platform Overview"
        sub={today}
        actions={
          <Link href="/reports"
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
            ↓ Export Reports
          </Link>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px rounded-2xl overflow-hidden"
        style={{ background: DS.border, border: `1px solid ${DS.border}` }}>
        {[
          { label: 'Active Learners',    value: d.activeLearners, color: DS.primary,   sub: 'Enrolled' },
          { label: 'Programmes',         value: d.activePrograms, color: '#7C3AED',    sub: 'Running' },
          { label: 'Attendance',         value: `${d.attRate}%`,  color: d.attRate>=75 ? DS.success : DS.danger, sub: d.attRate>=75?'On target':'Below target' },
          { label: 'Avg Score',          value: `${d.avgScore}%`, color: scoreColor(d.avgScore), sub: `${d.totalAssessments} assessed` },
          { label: 'Projects Done',      value: d.completedProj, color: '#7C3AED',     sub: `${d.totalProjects} total` },
          { label: 'High Risk',          value: d.highRisk,       color: d.highRisk>0 ? DS.danger : DS.success, sub: 'Learners' },
          { label: 'Open Issues',        value: d.openInterv,     color: d.openInterv>0 ? DS.warn : DS.success, sub: 'Interventions' },
          { label: 'Instructors',        value: d.instructors,    color: DS.textMid,   sub: `${d.pendingUsers} pending` },
        ].map(({ label, value, color, sub }) => (
          <KPICard key={label} label={label} value={value} color={color} sub={sub} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Attendance trend chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Attendance Trend" sub="Last 8 weeks" />
            <div className="p-6">
              {d.attTrend.length < 2 ? (
                <p className="text-sm text-center py-8" style={{ color: DS.textMuted }}>Not enough data yet</p>
              ) : (
                <>
                  <div className="flex items-end gap-2 h-32">
                    {d.attTrend.map(({ w, r }, i) => {
                      const h = Math.max(8, Math.round((r / 100) * 128));
                      const c = r >= 75 ? DS.primary : r >= 60 ? DS.warn : DS.danger;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t-lg transition-all" style={{ height: h, background: c, opacity: 0.85 }} />
                          <span className="text-[9px] tabular-nums font-semibold" style={{ color: DS.textMuted }}>{r}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2">
                    {d.attTrend.map(({ w }, i) => (
                      <span key={i} className="text-[9px] flex-1 text-center" style={{ color: DS.textMuted }}>{w}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Grade distribution */}
        <div>
          <Card style={{ height: '100%' }}>
            <CardHeader title="Grade Distribution" sub={`${d.totalAssessments} assessments`} />
            <div className="p-5 space-y-4">
              {[
                { label: 'Distinction', color: DS.primary,  range: '80%+' },
                { label: 'Merit',       color: DS.success,  range: '70–79%' },
                { label: 'Pass',        color: DS.warn,     range: '50–69%' },
                { label: 'Needs Support', color: DS.danger, range: 'Below 50%' },
              ].map(({ label, color, range }) => {
                const count = d.bands[label] || 0;
                const pct   = d.totalAssessments ? Math.round(count / d.totalAssessments * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: DS.text }}>{label}</span>
                        <span style={{ color: DS.textMuted }}>{range}</span>
                      </div>
                      <div className="flex items-center gap-2" style={{ color }}>
                        <span className="font-bold tabular-nums">{count}</span>
                        <span style={{ color: DS.textMuted }}>{pct}%</span>
                      </div>
                    </div>
                    <ProgressBar value={pct} color={color} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Risk overview */}
        <Card>
          <CardHeader title="Learner Risk Status" />
          <div className="p-5 space-y-3">
            {[
              { label: 'On Track',     count: d.lowRisk,    color: DS.success, bg: DS.successLight },
              { label: 'Monitoring',   count: d.mediumRisk, color: DS.warn,    bg: DS.warnLight },
              { label: 'High Risk',    count: d.highRisk,   color: DS.danger,  bg: DS.dangerLight },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: bg }}>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-sm font-semibold" style={{ color: DS.text }}>{label}</span>
                </div>
                <span className="text-xl font-black tabular-nums" style={{ color }}>{count}</span>
              </div>
            ))}
          </div>
          <div className="px-5 pb-4">
            <Link href="/risk"
              className="text-xs font-bold block text-center py-2 rounded-xl transition-colors"
              style={{ background: DS.primaryLight, color: DS.primary }}>
              View Risk Monitor →
            </Link>
          </div>
        </Card>

        {/* Sponsor summary */}
        <Card>
          <CardHeader title="Sponsors" sub={`${d.sponsors} active`} />
          <div className="p-5 space-y-3">
            <div className="rounded-xl p-4 text-center" style={{ background: DS.primaryLight }}>
              <p className="text-4xl font-black" style={{ color: DS.primary }}>{d.sponsors}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: DS.primary }}>Corporate Partners</p>
            </div>
            <Link href="/admin/sponsors"
              className="text-xs font-bold block text-center py-2 rounded-xl transition-colors"
              style={{ background: DS.primaryLight, color: DS.primary }}>
              Manage Sponsors →
            </Link>
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="p-5 grid grid-cols-2 gap-2">
            {[
              { label: 'Add Learner',        href: '/learners/new',        emoji: '👩‍🎓' },
              { label: 'Mark Attendance',    href: '/attendance',          emoji: '📅' },
              { label: 'Bulk Marks',         href: '/assessments/bulk',    emoji: '📊' },
              { label: 'Add Project',        href: '/projects/new',        emoji: '📁' },
              { label: 'Log Intervention',   href: '/interventions/new',   emoji: '⚠️' },
              { label: 'View Reports',       href: '/reports',             emoji: '📋' },
            ].map(({ label, href, emoji }) => (
              <Link key={label} href={href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
                style={{ background: '#F8FAFC', border: `1px solid ${DS.border}`, color: DS.textMid }}>
                <span className="text-base">{emoji}</span>
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* System health footer bar */}
      <div className="rounded-2xl px-6 py-4 flex flex-wrap items-center gap-6"
        style={{ background: DS.text, border: `1px solid ${DS.text}` }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Platform Health</p>
        {[
          { label: 'Learners',        value: d.activeLearners, color: '#60A5FA' },
          { label: 'Active Programs', value: d.activePrograms,  color: '#34D399' },
          { label: 'Platform Att.',   value: `${d.attRate}%`,   color: d.attRate>=75?'#34D399':'#F87171' },
          { label: 'Platform Score',  value: `${d.avgScore}%`,  color: scoreColor(d.avgScore) },
          { label: 'At Risk',         value: d.highRisk,        color: d.highRisk>0?'#F87171':'#34D399' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
            <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
