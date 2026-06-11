import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

interface SponsorLearner {
  learner_id: string;
  learner_code: string;
  grade: number;
  programme_status: string;
  enrollment_date: string;
  learner_profiles: { first_name: string; last_name: string } | null;
  schools: { school_name: string; district: string } | null;
  risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null;
  program_enrollments: Array<{
    status: string;
    programs: { program_name: string; program_type: string } | null;
  }>;
}

interface AttRecord   { status: string; session_date: string }
interface AssRecord   { percentage: number | null; grade_band: string | null; subject: string; assessment_date: string | null; program_id: string }
interface ProjRecord  { completion_status: string; stage: string | null; score: number | null; max_score: number | null }
interface IntervRecord { status: string; created_at: string }

async function getSponsorData(sponsorId: string) {
  const supabase = await createClient();

  const [linksRes, sponsorRes] = await Promise.all([
    supabase.from('sponsor_learners').select('learner_id').eq('sponsor_id', sponsorId),
    supabase.from('sponsors').select('sponsor_name, contact_name, contact_email').eq('sponsor_id', sponsorId).single(),
  ]);

  const learnerIds = (linksRes.data || []).map(l => l.learner_id);
  const sponsor    = sponsorRes.data;

  if (!learnerIds.length) return { sponsor, learnerIds: [], learners: [], att: [], ass: [], projects: [], interventions: [], mentorshipCount: 0, assWithLearner: [] };

  const [learnersRes, attRes, assRes, projRes, intRes, mentorRes, assLearnerRes] = await Promise.all([
    supabase.from('learners').select(`
      learner_id, learner_code, grade, programme_status, enrollment_date,
      learner_profiles(first_name, last_name),
      schools(school_name, district),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(status, programs(program_name, program_type))
    `).in('learner_id', learnerIds),

    supabase.from('attendance').select('status, session_date').in('learner_id', learnerIds),

    supabase.from('assessments').select('percentage, grade_band, subject, assessment_date, program_id').in('learner_id', learnerIds).order('assessment_date', { ascending: false }),

    supabase.from('projects').select('completion_status, stage, score, max_score').in('learner_id', learnerIds),

    supabase.from('interventions').select('status, created_at').in('learner_id', learnerIds),

    supabase.from('mentorship_sessions').select('session_id', { count: 'exact', head: true }).in('learner_id', learnerIds),

    // Need learner_id per assessment to compute per-learner score trends
    supabase.from('assessments').select('learner_id, percentage, assessment_date').in('learner_id', learnerIds).not('percentage', 'is', null).order('assessment_date', { ascending: true }),
  ]);

  return {
    sponsor,
    learnerIds,
    learners:        (learnersRes.data  || []) as unknown as SponsorLearner[],
    att:             (attRes.data       || []) as AttRecord[],
    ass:             (assRes.data       || []) as AssRecord[],
    projects:        (projRes.data      || []) as ProjRecord[],
    interventions:   (intRes.data       || []) as IntervRecord[],
    mentorshipCount: mentorRes.count    ?? 0,
    assWithLearner:  (assLearnerRes.data || []) as { learner_id: string; percentage: number; assessment_date: string }[],
  };
}

// SVG ring chart (no external lib)
function RingChart({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct   = total > 0 ? Math.min(value / total, 1) : 0;
  const r     = 36;
  const cx    = 50;
  const cy    = 50;
  const circ  = 2 * Math.PI * r;
  const dash  = pct * circ;
  const pctLabel = Math.round(pct * 100) + '%';

  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      {/* SVG handles both the arc AND the centred text — no HTML overlay needed */}
      <svg viewBox="0 0 100 100" width="96" height="96" style={{ flexShrink: 0 }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        {/* Arc — rotated from top via transform, not CSS rotate */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        {/* Percentage — perfectly centred in SVG coordinate space */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fontSize="16" fontWeight="900" fontFamily="system-ui,-apple-system,sans-serif"
          fill={color}>
          {pctLabel}
        </text>
      </svg>
      <p className="text-xs font-semibold text-center leading-tight w-full truncate px-1"
        style={{ color: DS.textMuted }}>{label}</p>
      <p className="text-xs text-center leading-tight" style={{ color: DS.textMuted }}>
        {value} of {total}
      </p>
    </div>
  );
}

// Inline bar
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default async function SponsorDashboard() {
  const user    = await requireAuth(['sponsor']);
  const { sponsor, learners, att, ass, projects, interventions, learnerIds, mentorshipCount, assWithLearner } = await getSponsorData(user.sponsor_id!);

  const sponsorName = sponsor?.sponsor_name || 'Sponsor';
  const total   = learnerIds.length;
  const active  = learners.filter(l => l.programme_status === 'active').length;

  const attRate  = att.length ? Math.round(att.filter(a => a.status === 'present').length / att.length * 100) : 0;
  const avgScore = ass.length ? Math.round(ass.reduce((s, a) => s + Number(a.percentage || 0), 0) / ass.length) : 0;
  const completedProj = projects.filter(p => ['marked','completed'].includes(p.stage || p.completion_status || '')).length;
  const openInterv    = interventions.filter(i => i.status !== 'resolved').length;

  const highRisk       = learners.filter(l => l.risk_scores?.risk_level === 'high').length;
  const onTrack        = learners.filter(l => l.risk_scores?.risk_level === 'low').length;
  const resolvedInterv = interventions.filter(i => i.status === 'resolved').length;
  const goodAtt        = learners.filter(l => (l.risk_scores?.attendance_rate ?? 0) >= 75).length;

  // Per-learner score improvement: compare first vs last assessment
  const learnerScoreMap: Record<string, number[]> = {};
  assWithLearner.forEach(a => {
    if (!learnerScoreMap[a.learner_id]) learnerScoreMap[a.learner_id] = [];
    learnerScoreMap[a.learner_id].push(a.percentage);
  });
  const improved = Object.values(learnerScoreMap).filter(scores => {
    if (scores.length < 2) return false;
    return scores[scores.length - 1] > scores[0];
  }).length;

  // ─── Narrative sentences ───────────────────────────────────────────────────
  const narratives: { icon: string; headline: string; detail: string; color: string }[] = [];

  if (total > 0) {
    narratives.push({
      icon:     '🎓',
      headline: `${active} of ${total} learners ${active === 1 ? 'is' : 'are'} actively enrolled`,
      detail:   `Your investment is supporting ${active} young ${active === 1 ? 'woman' : 'women'} in STEM — building skills, confidence, and career pathways.`,
      color:    '#1D4ED8',
    });
  }

  if (att.length > 0) {
    narratives.push({
      icon:     '📅',
      headline: `${goodAtt} of ${total} learners ${goodAtt === 1 ? 'is' : 'are'} attending consistently (75%+)`,
      detail:   `Overall attendance sits at ${attRate}% — ${attRate >= 80 ? 'a strong result showing real commitment from learners' : 'there is room to grow, and the team is actively following up on absences'}.`,
      color:    attRate >= 75 ? '#10B981' : '#F59E0B',
    });
  }

  if (improved > 0) {
    narratives.push({
      icon:     '📈',
      headline: `${improved} learner${improved !== 1 ? 's' : ''} improved ${improved !== 1 ? 'their' : 'their'} academic scores`,
      detail:   `Comparing first and most recent assessments, ${improved} of ${Object.keys(learnerScoreMap).length} learners with multiple results show measurable academic growth.`,
      color:    '#10B981',
    });
  }

  if (mentorshipCount > 0) {
    narratives.push({
      icon:     '🤝',
      headline: `${mentorshipCount} mentorship session${mentorshipCount !== 1 ? 's' : ''} logged`,
      detail:   `One-on-one mentorship is central to learner success. Each session provides personalised guidance, goal-setting, and emotional support.`,
      color:    '#7C3AED',
    });
  }

  if (interventions.length > 0) {
    narratives.push({
      icon:     '🛡️',
      headline: `${resolvedInterv} of ${interventions.length} support intervention${interventions.length !== 1 ? 's' : ''} resolved`,
      detail:   `When learners show signs of struggle, the team acts. ${openInterv > 0 ? `${openInterv} intervention${openInterv !== 1 ? 's are' : ' is'} currently active.` : 'All flagged cases have been addressed.'}`,
      color:    resolvedInterv === interventions.length ? '#10B981' : '#F59E0B',
    });
  }

  if (onTrack > 0) {
    narratives.push({
      icon:     '⭐',
      headline: `${onTrack} learner${onTrack !== 1 ? 's' : ''} ${onTrack !== 1 ? 'are' : 'is'} on track for programme completion`,
      detail:   `These learners are meeting attendance and academic benchmarks — they are well-positioned to complete the programme and achieve their goals.`,
      color:    '#10B981',
    });
  }

  // Grade distribution
  const gradeMap: Record<string, number> = {};
  learners.forEach(l => { const g = `Gr ${l.grade}`; gradeMap[g] = (gradeMap[g] || 0) + 1; });

  // School distribution
  const schoolMap: Record<string, number> = {};
  learners.forEach(l => {
    const s = l.schools?.school_name || 'Unknown';
    schoolMap[s] = (schoolMap[s] || 0) + 1;
  });

  // Programme distribution
  const progMap: Record<string, { count: number; type: string }> = {};
  learners.forEach(l => {
    (l.program_enrollments || []).forEach(e => {
      const n = e.programs?.program_name;
      if (n) { progMap[n] = { count: (progMap[n]?.count || 0) + 1, type: e.programs?.program_type || '' }; }
    });
  });

  // Grade band distribution from assessments
  const bands: Record<string, number> = { Distinction: 0, Merit: 0, Pass: 0, 'Needs Support': 0 };
  ass.forEach(a => { if (a.grade_band && bands[a.grade_band] !== undefined) bands[a.grade_band]++; });

  // Recent assessments trend (last 8 data points)
  const sortedAss = [...ass].sort((a, b) => (b.assessment_date || '').localeCompare(a.assessment_date || ''));
  const recentAss = sortedAss.slice(0, 8);

  const now = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Score colour helper
  const scoreColor = (v: number) => v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-8" style={{ color: DS.text }}>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1D4ED8' }}>
            Impact Dashboard
          </p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: DS.text }}>
            {sponsorName}
          </h1>
          <p className="text-sm mt-1" style={{ color: DS.textMuted }}>
            Sponsoring {total} learner{total !== 1 ? 's' : ''} across the Girls in STEM programme
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: DS.textMuted }}>Last updated</p>
          <p className="text-xs font-semibold" style={{ color: DS.textMid }}>{now}</p>
          <Link href="/sponsor/reports"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            ↓ Download Report
          </Link>
        </div>
      </div>

      {/* ── Narrative impact story ── */}
      {narratives.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: DS.textMuted }}>
            Your Impact This Programme
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {narratives.map((n, i) => (
              <div key={i} className="rounded-2xl p-5 space-y-2"
                style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{n.icon}</span>
                  <p className="text-sm font-bold leading-snug" style={{ color: n.color }}>{n.headline}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: DS.textMuted, paddingLeft: '2.5rem' }}>
                  {n.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px"
        style={{ background: DS.border, borderRadius: 16, overflow: 'hidden', border: `1px solid ${DS.border}` }}>
        {[
          {
            label:   'Learners Sponsored',
            value:   total,
            sub:     `${active} active`,
            color:   '#1D4ED8',
            big:     true,
          },
          {
            label:   'Attendance Rate',
            value:   `${attRate}%`,
            sub:     att.length > 0 ? `${att.filter(a=>a.status==='present').length} sessions attended` : 'No data',
            color:   attRate >= 75 ? '#10B981' : '#EF4444',
          },
          {
            label:   'Average Score',
            value:   `${avgScore}%`,
            sub:     `${ass.length} assessments recorded`,
            color:   scoreColor(avgScore),
          },
          {
            label:   'Projects Done',
            value:   completedProj,
            sub:     `${projects.length} total projects`,
            color:   '#7C3AED',
          },
          {
            label:   'On Track',
            value:   onTrack,
            sub:     `Low risk learners`,
            color:   '#10B981',
          },
          {
            label:   'Need Support',
            value:   highRisk,
            sub:     `High risk learners`,
            color:   highRisk > 0 ? '#EF4444' : '#10B981',
          },
        ].map(({ label, value, sub, color, big }) => (
          <div key={label} className="p-5 flex flex-col gap-1" style={{ background: DS.surface }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DS.textMuted }}>
              {label}
            </p>
            <p className="text-3xl font-black tabular-nums leading-none mt-1" style={{ color }}>
              {value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Impact rings + grade bands */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Impact rings */}
        <div className="lg:col-span-1 rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: DS.textMuted }}>
            Key Impact Indicators
          </h2>
          <div className="grid grid-cols-3 gap-2" style={{ overflow: 'hidden' }}>
            <RingChart value={attRate} total={100} color="#1D4ED8"  label="Attendance" />
            <RingChart value={avgScore} total={100} color="#10B981" label="Avg Score" />
            <RingChart value={onTrack} total={Math.max(total,1)} color="#7C3AED" label="On Track" />
          </div>
          <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
            <p className="text-xs font-semibold mb-3" style={{ color: DS.textMuted }}>RISK DISTRIBUTION</p>
            <div className="space-y-2">
              {[
                { label: 'Low Risk — On Track',      count: onTrack,  color: DS.success },
                { label: 'Medium Risk — Monitoring', count: learners.filter(l=>l.risk_scores?.risk_level==='medium').length, color: DS.warn },
                { label: 'High Risk — Needs Support', count: highRisk, color: DS.danger },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span style={{ color: DS.textMid }}>{label}</span>
                  </div>
                  <span className="font-bold tabular-nums" style={{ color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assessment grade distribution */}
        <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>
                Assessment Grade Distribution
              </h2>
              <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{ass.length} assessments across all learners</p>
            </div>
          </div>

          {ass.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: DS.textMuted }}>No assessment data yet</p>
          ) : (
            <div className="space-y-5">
              {[
                { label: 'Distinction', threshold: '80%+', color: '#1D4ED8' },
                { label: 'Merit',       threshold: '70–79%', color: DS.success },
                { label: 'Pass',        threshold: '50–69%', color: DS.warn },
                { label: 'Needs Support', threshold: 'Below 50%', color: DS.danger },
              ].map(({ label, threshold, color }) => {
                const count = bands[label] || 0;
                const pct   = ass.length ? Math.round(count / ass.length * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: DS.text }}>{label}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: DS.surfaceHover, color: DS.textMuted, border: `1px solid ${DS.border}` }}>
                          {threshold}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold tabular-nums" style={{ color }}>{count}</span>
                        <span className="text-xs" style={{ color: DS.textMuted }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Score trend mini sparkline */}
          {recentAss.length > 1 && (
            <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
              <p className="text-xs font-semibold mb-3" style={{ color: DS.textMuted }}>RECENT SCORE TREND</p>
              <div className="flex items-end gap-1.5 h-12">
                {[...recentAss].reverse().map((a, i) => {
                  const pct = Number(a.percentage || 0);
                  const h   = Math.max(8, Math.round((pct / 100) * 48));
                  return (
                    <div key={i} className="flex-1 rounded-sm transition-all"
                      style={{ height: h, background: scoreColor(pct), opacity: 0.8 }}
                      title={`${a.subject}: ${pct}%`} />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: DS.textMuted }}>Oldest</span>
                <span className="text-xs" style={{ color: DS.textMuted }}>Most Recent</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* School + Grade + Programme breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Schools */}
        <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: DS.textMuted }}>
            Schools
          </h2>
          {Object.keys(schoolMap).length === 0 ? (
            <p className="text-sm" style={{ color: DS.textMuted }}>No data</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(schoolMap).sort(([,a],[,b]) => b-a).map(([school, count]) => (
                <div key={school}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium truncate max-w-[170px]" style={{ color: DS.text }}>{school}</span>
                    <span className="text-sm font-bold tabular-nums ml-2" style={{ color: '#1D4ED8' }}>{count}</span>
                  </div>
                  <Bar value={count} max={total} color="#1D4ED8" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grades */}
        <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: DS.textMuted }}>
            Grade Distribution
          </h2>
          {Object.keys(gradeMap).length === 0 ? (
            <p className="text-sm" style={{ color: DS.textMuted }}>No data</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(gradeMap).sort(([a],[b]) => a.localeCompare(b)).map(([grade, count], i) => {
                const colors = ['#1D4ED8','#7C3AED','#10B981','#F59E0B','#EF4444'];
                const color  = colors[i % colors.length];
                return (
                  <div key={grade}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: DS.text }}>{grade}</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color }}>{count}</span>
                    </div>
                    <Bar value={count} max={total} color={color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Programmes */}
        <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: DS.textMuted }}>
            Programme Participation
          </h2>
          {Object.keys(progMap).length === 0 ? (
            <p className="text-sm" style={{ color: DS.textMuted }}>No programme data</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(progMap).sort(([,a],[,b]) => b.count - a.count).map(([name, { count, type }]) => (
                <div key={name} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: DS.text }}>{name}</p>
                    <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{type}</p>
                  </div>
                  <div className="shrink-0 ml-3 text-right">
                    <p className="text-lg font-black tabular-nums" style={{ color: '#1D4ED8' }}>{count}</p>
                    <p className="text-xs" style={{ color: DS.textMuted }}>learners</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA strip */}
      <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4"
        style={{ background: '#0F172A' }}>
        <div>
          <p className="text-white font-bold text-base">
            Your sponsorship is making a real difference.
          </p>
          <p className="text-white/50 text-sm mt-0.5">
            {total} girls supported &nbsp;·&nbsp; {active} actively learning &nbsp;·&nbsp; {completedProj} projects completed
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/sponsor/learners"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors text-white"
            style={{ background: '#1D4ED8' }}>
            View All Learners →
          </Link>
          <Link href="/sponsor/reports"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            Download Report
          </Link>
        </div>
      </div>

    </div>
  );
}
