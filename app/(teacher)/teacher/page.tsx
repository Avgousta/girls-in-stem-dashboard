import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DS, PageHeader, Card, CardHeader, scoreColor, MetricStrip, KPICard } from '@/components/platform/PlatformComponents';
import { fmt } from '@/utils';

interface RawLearnerEnroll {
  learner_id: string; learner_code: string; grade: number;
  risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null;
  learner_profiles: { first_name: string; last_name: string } | null;
  schools: { school_name: string } | null;
}
interface RawAttRecord { status: string; session_date: string }
interface RawAssRecord { percentage: number | null; grade_band: string | null; subject: string; assessment_date: string | null }
interface RawProjRecord { stage: string | null; completion_status: string; learner_id: string }
interface RawMeeting { meeting_id: string; title: string; scheduled_at: string; platform: string; duration_min: number; meeting_url?: string; programs: { program_name: string } | null }
interface RawProgram { program_id: string; program_name: string; program_type: string; program_enrollments: Array<{ count: number }> }

async function getTeacherData(userId: string) {
  const supabase = await createClient();

  const { data: programmes } = await supabase
    .from('programs')
    .select('program_id, program_name, program_type, program_enrollments(count)')
    .eq('instructor_id', userId)
    .eq('is_active', true);

  const programIds = ((programmes || []) as unknown as RawProgram[]).map(p => p.program_id);
  const fallback   = ['00000000-0000-0000-0000-000000000000'];

  const [learnersRes, attRes, assRes, projRes, intervRes, meetingsRes] = await Promise.all([
    supabase.from('program_enrollments')
      .select('learner_id, learners(learner_id, learner_code, grade, risk_scores(risk_level, attendance_rate, avg_score), learner_profiles(first_name, last_name), schools(school_name))')
      .in('program_id', programIds.length ? programIds : fallback)
      .eq('status', 'active'),

    supabase.from('attendance')
      .select('status, session_date')
      .in('program_id', programIds.length ? programIds : fallback)
      .order('session_date', { ascending: false })
      .limit(300),

    supabase.from('assessments')
      .select('percentage, grade_band, subject, assessment_date, learner_id')
      .in('program_id', programIds.length ? programIds : fallback)
      .order('assessment_date', { ascending: false })
      .limit(200),

    supabase.from('projects')
      .select('stage, completion_status, learner_id')
      .in('program_id', programIds.length ? programIds : fallback),

    supabase.from('interventions')
      .select('intervention_id, reason, status, created_at, learner_id')
      .eq('flagged_by', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase.from('online_meetings')
      .select('meeting_id, title, scheduled_at, platform, duration_min, programs(program_name)')
      .eq('instructor_id', userId)
      .eq('is_cancelled', false)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(3),
  ]);

  const learners = ((learnersRes.data || []) as unknown as Array<{ learners: RawLearnerEnroll }>).map(e => e.learners).filter(Boolean);
  const att      = (attRes.data  || []) as unknown as RawAttRecord[];
  const ass      = (assRes.data  || []) as unknown as RawAssRecord[];
  const proj     = (projRes.data || []) as unknown as RawProjRecord[];

  const attRate  = att.length ? Math.round(att.filter(a => a.status==='present').length/att.length*100) : 0;
  const avgScore = ass.length ? Math.round(ass.reduce((s,a)=>s+Number(a.percentage||0),0)/ass.length) : 0;
  const highRisk = learners.filter(l => l.risk_scores?.risk_level === 'high').length;
  const doneProj = proj.filter(p => ['marked','completed'].includes(p.stage||p.completion_status||'')).length;

  // Recent assessments
  const recentAss = ass.slice(0, 6);

  // Today's session
  const today    = new Date().toISOString().slice(0,10);
  const todayAtt = att.filter(a => a.session_date === today);
  const todayPct = todayAtt.length ? Math.round(todayAtt.filter(a=>a.status==='present').length/todayAtt.length*100) : null;

  return {
    programmes: (programmes || []) as unknown as RawProgram[],
    learners,
    attRate, avgScore, highRisk, doneProj,
    openInterv: intervRes.data?.length || 0,
    interventions: intervRes.data || [],
    meetings:     meetingsRes.data || [],
    recentAss,
    todayPct,
    totalLearners: learners.length,
  };
}

export default async function TeacherDashboard() {
  const user = await requireAuth(['instructor']);
  const d    = await getTeacherData(user.user_id);
  const firstName = user.full_name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8" style={{ color: DS.text }}>

      <PageHeader
        eyebrow="Instructor Portal"
        title={`${greeting}, ${firstName}`}
        sub={`You have ${d.totalLearners} learner${d.totalLearners!==1?'s':''} across ${d.programmes.length} programme${d.programmes.length!==1?'s':''}`}
        actions={
          <div className="flex gap-2">
            <Link href="/teacher/meetings"
              className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
              + Schedule Class
            </Link>
            <Link href="/assessments/bulk"
              className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ background: DS.text, color: 'white' }}>
              Capture Marks
            </Link>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px rounded-2xl overflow-hidden"
        style={{ background: DS.border, border: `1px solid ${DS.border}` }}>
        {[
          { label: 'My Learners',   value: d.totalLearners,  color: DS.primary,          sub: `${d.programmes.length} programmes` },
          { label: 'Attendance',    value: `${d.attRate}%`,  color: d.attRate>=75?DS.success:DS.danger, sub: d.todayPct!==null?`Today: ${d.todayPct}%`:'No session today' },
          { label: 'Avg Score',     value: `${d.avgScore}%`, color: scoreColor(d.avgScore), sub: `${d.recentAss.length} recent` },
          { label: 'High Risk',     value: d.highRisk,       color: d.highRisk>0?DS.danger:DS.success, sub: 'Need attention' },
          { label: 'Open Issues',   value: d.openInterv,     color: d.openInterv>0?DS.warn:DS.success, sub: 'Interventions' },
        ].map(({ label, value, color, sub }) => (
          <KPICard key={label} label={label} value={value} color={color} sub={sub} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming classes */}
        <div className="lg:col-span-1">
          <Card style={{ height: '100%' }}>
            <CardHeader title="Upcoming Classes" sub={`${d.meetings.length} scheduled`}
              action={
                <Link href="/teacher/meetings"
                  className="text-xs font-bold" style={{ color: DS.primary }}>
                  View all →
                </Link>
              } />
            <div className="p-4 space-y-3">
              {d.meetings.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-2xl mb-2">📅</p>
                  <p className="text-xs" style={{ color: DS.textMuted }}>No upcoming classes</p>
                  <Link href="/teacher/meetings"
                    className="text-xs font-bold mt-2 block" style={{ color: DS.primary }}>
                    Schedule one →
                  </Link>
                </div>
              ) : ((d.meetings as unknown as RawMeeting[]) || []).map(m => {
                const start = new Date(m.scheduled_at);
                const isToday = start.toISOString().slice(0,10) === new Date().toISOString().slice(0,10);
                const PLAT: Record<string,string> = { zoom:'🎥', meet:'🟢', teams:'💼', other:'🔗' };
                return (
                  <div key={m.meeting_id} className="rounded-xl p-3.5"
                    style={{ background: isToday ? DS.primaryLight : '#F8FAFC', border: `1px solid ${isToday ? DS.primaryBorder : DS.border}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: DS.text }}>{PLAT[m.platform] || '🔗'} {m.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{m.programs?.program_name}</p>
                      </div>
                      {isToday && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: DS.primary, color: 'white' }}>TODAY</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: DS.textMuted }}>
                      <span>📅 {start.toLocaleDateString('en-ZA',{month:'short',day:'numeric'})}</span>
                      <span>🕐 {start.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</span>
                      <span>⏱ {m.duration_min}m</span>
                    </div>
                    <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                      className="mt-2 text-xs font-bold block text-center py-1.5 rounded-lg"
                      style={{ background: DS.primary, color: 'white' }}>
                      Start Class →
                    </a>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Recent marks */}
        <div>
          <Card>
            <CardHeader title="Recent Assessments" sub="Latest marks captured"
              action={
                <Link href="/assessments/bulk"
                  className="text-xs font-bold" style={{ color: DS.primary }}>
                  Capture marks →
                </Link>
              } />
            <div className="p-4 space-y-2">
              {d.recentAss.length === 0 ? (
                <div className="text-center py-6 text-xs" style={{ color: DS.textMuted }}>
                  No assessments recorded yet
                </div>
              ) : (d.recentAss as unknown as RawAssRecord[]).map((a, i) => {
                const pct = Number(a.percentage || 0);
                const c   = scoreColor(pct);
                const bandBg: Record<string,string> = {
                  Distinction: DS.primaryLight, Merit: DS.successLight,
                  Pass: DS.warnLight, 'Needs Support': DS.dangerLight,
                };
                const bandColor: Record<string,string> = {
                  Distinction: DS.primary, Merit: DS.success, Pass: DS.warn, 'Needs Support': DS.danger,
                };
                return (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: '#F8FAFC', border: `1px solid ${DS.borderLight}` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: DS.text }}>{a.subject}</p>
                      <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
                        {a.assessment_date ? fmt.date(a.assessment_date) : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {a.grade_band && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: bandBg[a.grade_band] || DS.borderLight, color: bandColor[a.grade_band] || DS.textMid }}>
                          {a.grade_band}
                        </span>
                      )}
                      <span className="text-sm font-black tabular-nums w-10 text-right" style={{ color: c }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Open interventions + at-risk */}
        <div className="space-y-4">
          {/* At-risk learners */}
          <Card>
            <CardHeader title="Needs Attention" sub={`${d.highRisk} high-risk learners`} />
            <div className="p-4 space-y-2">
              {d.learners.filter(l => l.risk_scores?.risk_level === 'high').slice(0, 4).map((l, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: DS.dangerLight, border: `1px solid #FECACA` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: DS.danger }}>
                      {l.learner_profiles?.first_name?.[0]}{l.learner_profiles?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: DS.text }}>
                        {l.learner_profiles?.first_name} {l.learner_profiles?.last_name}
                      </p>
                      <p className="text-[10px]" style={{ color: DS.textMuted }}>
                        Att: {l.risk_scores?.attendance_rate||0}% · Score: {l.risk_scores?.avg_score||0}%
                      </p>
                    </div>
                  </div>
                  <Link href={`/learners/${l.learner_id}`}
                    className="text-[10px] font-bold" style={{ color: DS.danger }}>
                    View →
                  </Link>
                </div>
              ))}
              {d.highRisk === 0 && (
                <p className="text-xs text-center py-4" style={{ color: DS.textMuted }}>✅ All learners on track</p>
              )}
              <Link href="/teacher/learners"
                className="text-xs font-bold block text-center py-2 rounded-xl"
                style={{ background: DS.primaryLight, color: DS.primary }}>
                View All Learners →
              </Link>
            </div>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader title="Quick Actions" />
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Attendance',     href: '/attendance',          emoji: '📅' },
                { label: 'Bulk Marks',     href: '/assessments/bulk',    emoji: '📊' },
                { label: 'Add Project',    href: '/projects/new',        emoji: '📁' },
                { label: 'Schedule Class', href: '/teacher/meetings',    emoji: '🎥' },
                { label: 'Intervention',   href: '/interventions/new',   emoji: '⚠️' },
                { label: 'Mentorship',     href: '/mentorship/new',      emoji: '💬' },
              ].map(({ label, href, emoji }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
                  style={{ background: '#F8FAFC', border: `1px solid ${DS.border}`, color: DS.textMid }}>
                  <span>{emoji}</span>
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* My programmes */}
      {d.programmes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
              My Programmes
            </p>
            <Link href="/attendance" className="text-xs font-bold" style={{ color: DS.primary }}>
              Mark Attendance →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {d.programmes.map(prog => {
              const enrolled = prog.program_enrollments?.[0]?.count || 0;
              const ICONS: Record<string,string> = { STEM:'🔬',Coding:'💻',Robotics:'🤖','After-School':'📚',Hybrid:'🌐',Mathematics:'📐',Science:'🧪' };
              return (
                <Card key={prog.program_id}>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: '#F8FAFC', border: `1px solid ${DS.border}` }}>
                        {ICONS[prog.program_type] || '📚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: DS.text }}>{prog.program_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded font-semibold"
                            style={{ background: DS.primaryLight, color: DS.primary }}>
                            {prog.program_type}
                          </span>
                          <span className="text-xs" style={{ color: DS.textMuted }}>{enrolled} learners</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <MetricStrip metrics={[
                    { label: 'Learners', value: enrolled,          color: DS.primary },
                    { label: 'Rate',     value: `${d.attRate}%`,   color: d.attRate>=75?DS.success:DS.danger },
                    { label: 'Score',    value: `${d.avgScore}%`,  color: scoreColor(d.avgScore) },
                  ]} />
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
