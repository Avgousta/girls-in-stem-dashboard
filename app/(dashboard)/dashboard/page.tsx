import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  DS, KPICard, PageHeader, Card, CardHeader,
  ProgressBar, scoreColor,
} from '@/components/platform/PlatformComponents';
import { AttendanceTrendChart } from './DashboardCharts';
import {
  AlertTriangle, Clock, UserCheck, HeartHandshake,
  ShieldAlert, TrendingUp,
} from 'lucide-react';

async function getAdminData() {
  const supabase = await createClient();
  const [
    learnersRes, programsRes, attendanceRes, assessmentsRes,
    riskRes, interventionsRes, projectsRes, sponsorsRes, usersRes,
  ] = await Promise.all([
    supabase.from('learners').select('learner_id, programme_status'),
    supabase.from('programs').select('program_id, is_active'),
    supabase.from('attendance').select('status, session_date').order('session_date', { ascending: false }).limit(500),
    supabase.from('assessments').select('percentage, grade_band').limit(200),
    supabase.from('risk_scores').select('risk_level'),
    supabase.from('interventions').select(`
      intervention_id, status, priority, due_date, created_at, reason,
      learners!inner(learner_profiles(first_name, last_name))
    `).order('created_at', { ascending: false }).limit(100),
    supabase.from('projects').select('stage, completion_status'),
    supabase.from('sponsors').select('sponsor_id'),
    supabase.from('users').select('user_id, full_name, role, is_active, created_at').order('created_at', { ascending: false }),
  ]);

  const learners      = learnersRes.data      || [];
  const programs      = programsRes.data      || [];
  const attendance    = attendanceRes.data    || [];
  const assessments   = assessmentsRes.data   || [];
  const risks         = riskRes.data          || [];
  interface IntervRow { intervention_id:string; status:string; priority:string; reason:string; created_at:string; due_date:string|null; learner_id:string; learners:{learner_profiles:{first_name:string;last_name:string}|null}|null }
  const interventions = (interventionsRes.data || []) as unknown as IntervRow[];
  const projects      = projectsRes.data      || [];
  const sponsors      = sponsorsRes.data      || [];
  const users         = usersRes.data         || [];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeLearners = learners.filter(l => l.programme_status === 'active').length;
  const activePrograms = programs.filter(p => p.is_active).length;
  const presentCount   = attendance.filter(a => a.status === 'present').length;
  const attRate        = attendance.length ? Math.round(presentCount / attendance.length * 100) : 0;
  const avgScore       = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + Number(a.percentage || 0), 0) / assessments.length) : 0;
  const highRisk       = risks.filter(r => r.risk_level === 'high').length;
  const mediumRisk     = risks.filter(r => r.risk_level === 'medium').length;
  const lowRisk        = risks.filter(r => r.risk_level === 'low').length;
  const openInterv     = interventions.filter(i => i.status !== 'resolved').length;
  const completedProj  = (projects as unknown as Array<{ stage: string | null; completion_status: string }>).filter(p => ['marked','completed'].includes(p.stage || p.completion_status || '')).length;
  const instructors    = users.filter(u => u.role === 'instructor' && u.is_active).length;

  // ── Attendance trend — last 8 weeks ──────────────────────────────────────
  const weekMap: Record<string, { present: number; total: number }> = {};
  attendance.forEach(a => {
    const d   = new Date(a.session_date);
    const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1);
    const key = mon.toISOString().slice(0, 10);
    if (!weekMap[key]) weekMap[key] = { present: 0, total: 0 };
    weekMap[key].total++;
    if (a.status === 'present') weekMap[key].present++;
  });
  const attTrend = Object.entries(weekMap).sort(([a],[b]) => a.localeCompare(b)).slice(-8)
    .map(([, v]) => ({
      w: (() => { const d = new Date(Object.keys(weekMap).sort()[0]); return d.toLocaleDateString('en-ZA',{month:'short',day:'numeric'}); })(),
      r: v.total ? Math.round(v.present / v.total * 100) : 0,
    }));

  // Fix week labels properly
  const attTrendFixed = Object.entries(weekMap).sort(([a],[b]) => a.localeCompare(b)).slice(-8)
    .map(([w, v]) => ({
      w: new Date(w).toLocaleDateString('en-ZA', { month:'short', day:'numeric' }),
      r: v.total ? Math.round(v.present / v.total * 100) : 0,
    }));

  // ── Grade band distribution ───────────────────────────────────────────────
  const bands: Record<string, number> = { Distinction:0, Merit:0, Pass:0, 'Needs Support':0 };
  assessments.forEach(a => { if (a.grade_band && bands[a.grade_band] !== undefined) bands[a.grade_band]++; });

  // ── Alerts ───────────────────────────────────────────────────────────────
  const today            = new Date().toISOString().slice(0, 10);
  const pendingApprovals = users.filter(u => !u.is_active && u.role === 'instructor');
  const criticalOpen     = interventions.filter(i => i.priority === 'critical' && i.status !== 'resolved');
  const overdueOpen      = interventions.filter(i =>
    i.due_date && i.due_date < today && i.status !== 'resolved'
  );
  const recentInterv     = interventions.filter(i => i.status !== 'resolved').slice(0, 5);

  return {
    activeLearners, activePrograms, attRate, avgScore,
    highRisk, mediumRisk, lowRisk,
    openInterv, completedProj, instructors, sponsors: sponsors.length,
    attTrend: attTrendFixed, bands,
    totalAssessments: assessments.length, totalProjects: projects.length,
    pendingApprovals, criticalOpen, overdueOpen, recentInterv,
  };
}

export default async function AdminDashboard() {
  await requireAuth(['admin', 'instructor']);
  const d   = await getAdminData();
  const now = new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' });

  const alertCount = d.pendingApprovals.length + d.criticalOpen.length + d.overdueOpen.length;

  return (
    <div className="space-y-6 pb-20" style={{ color: DS.text }}>

      <PageHeader
        eyebrow="Admin Dashboard"
        title="Platform Overview"
        sub={now}
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
          { label: 'Active Learners', value: d.activeLearners, color: DS.primary,  sub: 'Enrolled'                  },
          { label: 'Programmes',      value: d.activePrograms, color: '#7C3AED',   sub: 'Running'                   },
          { label: 'Attendance',      value: `${d.attRate}%`,  color: d.attRate>=75 ? 'var(--ds-success)' : 'var(--ds-danger)', sub: d.attRate>=75?'On target':'Below target' },
          { label: 'Avg Score',       value: `${d.avgScore}%`, color: scoreColor(d.avgScore), sub: `${d.totalAssessments} assessed` },
          { label: 'Projects Done',   value: d.completedProj,  color: '#7C3AED',   sub: `${d.totalProjects} total`  },
          { label: 'High Risk',       value: d.highRisk,       color: d.highRisk>0?'var(--ds-danger)':'var(--ds-success)', sub: 'Learners' },
          { label: 'Open Issues',     value: d.openInterv,     color: d.openInterv>0?'var(--ds-warn)':'var(--ds-success)', sub: 'Interventions' },
          { label: 'Instructors',     value: d.instructors,    color: DS.textMid,   sub: `${d.pendingApprovals.length} pending` },
        ].map(({ label, value, color, sub }) => (
          <KPICard key={label} label={label} value={value} color={color} sub={sub} />
        ))}
      </div>

      {/* Alerts banner — only shown when there are items */}
      {alertCount > 0 && (
        <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
          style={{ background: 'var(--ds-danger-light)', border: '1px solid var(--ds-danger)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-danger)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--ds-danger)' }}>
              {alertCount} item{alertCount !== 1 ? 's' : ''} need your attention
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {d.pendingApprovals.length > 0 && (
              <Link href="/admin/users"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--ds-danger)', color: '#fff' }}>
                {d.pendingApprovals.length} pending approval{d.pendingApprovals.length !== 1 ? 's' : ''}
              </Link>
            )}
            {d.criticalOpen.length > 0 && (
              <Link href="/interventions"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--ds-danger)', color: '#fff' }}>
                {d.criticalOpen.length} critical intervention{d.criticalOpen.length !== 1 ? 's' : ''}
              </Link>
            )}
            {d.overdueOpen.length > 0 && (
              <Link href="/interventions"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--ds-danger)', color: '#fff' }}>
                {d.overdueOpen.length} overdue intervention{d.overdueOpen.length !== 1 ? 's' : ''}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Attendance trend — spans 2 cols */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Attendance Trend" sub="Last 8 weeks" />
            <div className="p-5">
              <AttendanceTrendChart data={d.attTrend} />
            </div>
          </Card>
        </div>

        {/* Grade distribution */}
        <Card>
          <CardHeader title="Grade Distribution" sub={`${d.totalAssessments} assessments`} />
          <div className="p-5 space-y-4">
            {[
              { label: 'Distinction',   color: '#818CF8', range: '80%+' },
              { label: 'Merit',         color: 'var(--ds-success)', range: '70–79%' },
              { label: 'Pass',          color: 'var(--ds-warn)',    range: '50–69%' },
              { label: 'Needs Support', color: 'var(--ds-danger)',  range: '< 50%'  },
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold tabular-nums" style={{ color }}>{count}</span>
                      <span style={{ color: DS.textMuted }}>({pct}%)</span>
                    </div>
                  </div>
                  <ProgressBar value={pct} color={color} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Risk status */}
        <Card>
          <CardHeader title="Learner Risk Status" />
          <div className="p-4 space-y-2.5">
            {[
              { label: 'On Track',   count: d.lowRisk,    color: 'var(--ds-success)', bg: 'var(--ds-success-light)' },
              { label: 'Monitoring', count: d.mediumRisk, color: 'var(--ds-warn)',    bg: 'var(--ds-warn-light)'    },
              { label: 'High Risk',  count: d.highRisk,   color: 'var(--ds-danger)',  bg: 'var(--ds-danger-light)'  },
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
          <div className="px-4 pb-4">
            <Link href="/risk"
              className="text-xs font-bold block text-center py-2 rounded-xl transition-colors"
              style={{ background: DS.primaryLight, color: DS.primary }}>
              View Risk Monitor →
            </Link>
          </div>
        </Card>

        {/* Recent open interventions */}
        <Card>
          <CardHeader title="Open Interventions" sub={`${d.openInterv} unresolved`} />
          {d.recentInterv.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-sm" style={{ color: DS.textMuted }}>All interventions resolved ✓</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: DS.borderLight }}>
              {d.recentInterv.map(i => {
                const learner = `${i.learners?.learner_profiles?.first_name ?? ''} ${i.learners?.learner_profiles?.last_name ?? ''}`.trim() || '—';
                const isCrit  = i.priority === 'critical' || i.priority === 'high';
                return (
                  <div key={i.intervention_id} className="px-5 py-3 flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 shrink-0"
                      style={{ color: isCrit ? 'var(--ds-danger)' : 'var(--ds-warn)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: DS.text }}>{learner}</p>
                      <p className="text-xs truncate" style={{ color: DS.textMuted }}>
                        {i.reason?.slice(0, 60)}{(i.reason?.length ?? 0) > 60 ? '…' : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase"
                      style={{
                        background: isCrit ? 'var(--ds-danger-light)' : 'var(--ds-warn-light)',
                        color:      isCrit ? 'var(--ds-danger)'       : 'var(--ds-warn)',
                      }}>
                      {i.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 pb-4 pt-2">
            <Link href="/interventions"
              className="text-xs font-bold block text-center py-2 rounded-xl"
              style={{ background: DS.primaryLight, color: DS.primary }}>
              View All Interventions →
            </Link>
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { label: 'Add Learner',      href: '/learners/new',      emoji: '👩‍🎓' },
              { label: 'Attendance',       href: '/attendance',         emoji: '📅' },
              { label: 'Bulk Marks',       href: '/assessments/bulk',   emoji: '📊' },
              { label: 'Log Intervention', href: '/interventions/new',  emoji: '⚠️' },
              { label: 'Risk Monitor',     href: '/risk',               emoji: '🛡️' },
              { label: 'Mentorship',       href: '/mentorship',         emoji: '💜' },
              { label: 'Add Project',      href: '/projects/new',       emoji: '📁' },
              { label: 'Reports',          href: '/reports',            emoji: '📋' },
            ].map(({ label, href, emoji }) => (
              <Link key={label} href={href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}`, color: DS.textMid as string }}>
                <span className="text-base">{emoji}</span>
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Platform health strip */}
      <div className="rounded-2xl px-6 py-4 flex flex-wrap items-center gap-6"
        style={{ background: DS.surface, border: `1px solid ${DS.primaryBorder}` }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: DS.primary }}>
          Platform Health
        </p>
        {[
          { label: 'Active Learners', value: d.activeLearners,      color: DS.primary                                      },
          { label: 'Active Programs', value: d.activePrograms,       color: '#34D399'                                       },
          { label: 'Attendance',      value: `${d.attRate}%`,        color: d.attRate  >= 75 ? '#34D399' : 'var(--ds-danger)' },
          { label: 'Avg Score',       value: `${d.avgScore}%`,       color: scoreColor(d.avgScore)                           },
          { label: 'Sponsors',        value: d.sponsors,             color: '#818CF8'                                       },
          { label: 'At Risk',         value: d.highRisk,             color: d.highRisk > 0 ? 'var(--ds-danger)' : '#34D399' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: DS.textMuted }}>{label}</p>
            <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
