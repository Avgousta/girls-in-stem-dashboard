import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

const RISK_CONFIG = {
  high:   { label: 'High Risk',    bg: '#FEF2F2', color: DS.danger, dot: '#EF4444' },
  medium: { label: 'Monitoring',   bg: '#FFFBEB', color: DS.warn, dot: '#F59E0B' },
  low:    { label: 'On Track',     bg: '#ECFDF5', color: DS.success, dot: '#10B981' },
};

const TRACK_ICONS: Record<string, string> = {
  'STEM':     '🔬', 'Coding': '💻', 'Robotics': '🤖',
  'Science':  '🧪', 'Mathematics': '📐', 'Design': '🎨',
  'Engineering': '⚙️', 'After-School': '📚', 'Hybrid': '🌐',
};

export default async function SponsorLearnersPage() {
  const user     = await requireAuth(['sponsor']);
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('sponsor_learners').select('learner_id').eq('sponsor_id', user.sponsor_id);
  const ids = (links || []).map(l => l.learner_id);

  const { data: learners } = ids.length ? await supabase
    .from('learners')
    .select(`
      learner_id, learner_code, grade, programme_status, enrollment_date,
      learner_profiles(first_name, last_name, avatar_url),
      schools(school_name, district),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(programs(program_name, program_type)),
      assessments(percentage, grade_band),
      projects(completion_status, stage)
    `)
    .in('learner_id', ids)
    .order('learner_code') : { data: [] };

  interface SponsorLearnerRow { learner_id: string; learner_code: string; grade: number; programme_status: string; enrollment_date: string; learner_profiles: { first_name: string; last_name: string; avatar_url?: string | null } | null; schools: { school_name: string; district: string } | null; risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null; program_enrollments: Array<{ programs: { program_name: string; program_type: string } | null }>; assessments: Array<{ percentage: number | null; grade_band: string | null }>; projects: Array<{ completion_status: string; stage: string | null }> }
  const list = ((learners || []) as unknown as SponsorLearnerRow[]).map(l => {
    const att       = Math.floor(l.risk_scores?.attendance_rate || 0);
    const score     = Math.round(l.risk_scores?.avg_score || 0);
    const risk      = (l.risk_scores?.risk_level || 'low') as keyof typeof RISK_CONFIG;
    const progs     = (l.program_enrollments || []).map(e => e.programs?.program_name).filter((n): n is string => !!n);
    const progType  = (l.program_enrollments || [])[0]?.programs?.program_type || 'STEM';
    const doneProj  = (l.projects || []).filter(p => ['marked','completed'].includes(p.stage || p.completion_status || '')).length;
    const totalAss  = (l.assessments || []).length;
    const initials  = `${l.learner_profiles?.first_name?.[0] || ''}${l.learner_profiles?.last_name?.[0] || ''}`.toUpperCase();
    return {
      id:        l.learner_id,
      code:      l.learner_code,
      name:      `${l.learner_profiles?.first_name || ''} ${l.learner_profiles?.last_name || ''}`.trim(),
      grade:     l.grade,
      school:    l.schools?.school_name || '—',
      district:  l.schools?.district || '',
      status:    l.programme_status,
      avatar:    l.learner_profiles?.avatar_url,
      risk, att, score, progs, progType, doneProj, totalAss, initials,
    };
  });

  const active = list.filter(l => l.status === 'active').length;
  const onTrack = list.filter(l => l.risk === 'low').length;
  const atRisk  = list.filter(l => l.risk === 'high').length;

  const scoreColor = (v: number) => v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-8" style={{ color: DS.text }}>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1D4ED8' }}>
            Learner Portfolio
          </p>
          <h1 className="text-3xl font-black tracking-tight">Sponsored Learners</h1>
          <p className="text-sm mt-1" style={{ color: DS.textMuted }}>
            {list.length} learners &nbsp;·&nbsp; {active} active &nbsp;·&nbsp; {onTrack} on track &nbsp;·&nbsp; {atRisk} need support
          </p>
        </div>
        <Link href="/api/v1/reports/sponsor/learners"
          className="text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
          ↓ Export CSV
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: `${active} Active`,             color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: `${onTrack} On Track`,           color: DS.success, bg: '#ECFDF5', border: '#A7F3D0' },
          { label: `${list.filter(l=>l.risk==='medium').length} Monitoring`, color: DS.warn, bg: '#FFFBEB', border: '#FDE68A' },
          { label: `${atRisk} High Risk`,           color: DS.danger, bg: '#FEF2F2', border: '#FECACA' },
        ].map(({ label, color, bg, border }) => (
          <span key={label} className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: bg, color, border: `1px solid ${border}` }}>
            {label}
          </span>
        ))}
      </div>

      {/* Learner cards grid */}
      {list.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="text-4xl mb-3">👩‍🎓</div>
          <p className="font-semibold" style={{ color: DS.textMuted }}>No learners linked yet</p>
          <p className="text-sm mt-1" style={{ color: DS.textMuted }}>Contact the platform administrator to link learners.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map(l => {
            const riskCfg = RISK_CONFIG[l.risk];
            const icon    = TRACK_ICONS[l.progType] || TRACK_ICONS['STEM'];
            const attColor = l.att >= 75 ? '#10B981' : l.att >= 60 ? '#F59E0B' : '#EF4444';
            return (
              <Link key={l.id} href={`/api/v1/reports/learner/${l.id}`} target="_blank"
                className="block rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: DS.surface, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

                {/* Card header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {l.avatar ? (
                        <img src={l.avatar} alt={l.name}
                          className="w-11 h-11 rounded-xl object-cover"
                          style={{ border: '2px solid #F1F5F9' }} />
                      ) : (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black"
                          style={{ background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)' }}>
                          {l.initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: DS.text }}>{l.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
                          {l.code} &nbsp;·&nbsp; Grade {l.grade}
                        </p>
                      </div>
                    </div>
                    {/* Risk badge */}
                    <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: riskCfg.bg, color: riskCfg.color }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskCfg.dot }} />
                      {riskCfg.label}
                    </div>
                  </div>

                  {/* School + track */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-base">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: DS.textMid }}>{l.school}</p>
                      {l.progs[0] && <p className="text-xs truncate" style={{ color: DS.textMuted }}>{l.progs[0]}</p>}
                    </div>
                  </div>
                </div>

                {/* Metrics strip */}
                <div className="grid grid-cols-3 divide-x" style={{ borderTop: `1px solid ${DS.borderLight}`, borderColor: DS.borderLight }}>
                  {[
                    { label: 'Attendance', value: `${l.att}%`, color: attColor },
                    { label: 'Avg Score',  value: `${l.score}%`, color: scoreColor(l.score) },
                    { label: 'Projects',   value: l.doneProj, color: '#7C3AED' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="px-3 py-3 text-center" style={{ borderColor: DS.borderLight }}>
                      <p className="text-base font-black tabular-nums" style={{ color }}>{value}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: DS.textMuted }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="px-5 py-4 space-y-2.5" style={{ borderTop: '1px solid #F8FAFC' }}>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: DS.textMuted }}>Attendance</span>
                      <span className="font-semibold" style={{ color: attColor }}>{l.att}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                      <div className="h-full rounded-full" style={{ width: `${l.att}%`, background: attColor }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: DS.textMuted }}>Score</span>
                      <span className="font-semibold" style={{ color: scoreColor(l.score) }}>{l.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${l.score}%`, background: scoreColor(l.score) }} />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-4 flex items-center justify-between">
                  <span className="text-xs" style={{ color: DS.textMuted }}>
                    {l.totalAss} assessment{l.totalAss !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#1D4ED8' }}>
                    View Report →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
