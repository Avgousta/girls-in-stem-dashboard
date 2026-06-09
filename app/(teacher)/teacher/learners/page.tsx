import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DS, PageHeader, Card, CardHeader, ProgressBar, scoreColor, StatusBadge } from '@/components/platform/PlatformComponents';

export default async function TeacherLearnersPage() {
  const user     = await requireAuth(['instructor']);
  const supabase = await createClient();

  const { data: programmes } = await supabase
    .from('programs')
    .select('program_id, program_name, program_type')
    .eq('instructor_id', user.user_id)
    .eq('is_active', true);

  const programIds = (programmes || []).map((p: any) => p.program_id);

  const { data: enrollments } = programIds.length
    ? await supabase
        .from('program_enrollments')
        .select(`
          learner_id, programs(program_name, program_type),
          learners(
            learner_id, learner_code, grade,
            learner_profiles(first_name, last_name, avatar_url),
            schools(school_name),
            risk_scores(risk_level, attendance_rate, avg_score),
            projects(stage, completion_status)
          )
        `)
        .in('program_id', programIds)
        .eq('status', 'active')
    : { data: [] };

  const learners = (enrollments || []).map((e: any) => {
    const l        = e.learners;
    const risk     = l?.risk_scores?.risk_level || 'low';
    const att      = Math.floor(l?.risk_scores?.attendance_rate || 0);
    const score    = Math.round(l?.risk_scores?.avg_score || 0);
    const initials = `${l?.learner_profiles?.first_name?.[0]||''}${l?.learner_profiles?.last_name?.[0]||''}`.toUpperCase();
    const doneProj = (l?.projects||[]).filter((p: any)=>['marked','completed'].includes(p.stage||p.completion_status||'')).length;
    return { ...l, risk, att, score, initials, doneProj, programme: e.programs?.program_name, progType: e.programs?.program_type };
  }).filter(Boolean);

  const highRisk  = learners.filter((l: any) => l.risk === 'high').length;
  const onTrack   = learners.filter((l: any) => l.risk === 'low').length;
  const RISK_CFG  = { high:{color:DS.danger,bg:DS.dangerLight,dot:'#EF4444',label:'High Risk'}, medium:{color:DS.warn,bg:DS.warnLight,dot:'#F59E0B',label:'Monitoring'}, low:{color:DS.success,bg:DS.successLight,dot:'#10B981',label:'On Track'} };

  return (
    <div className="space-y-8" style={{ color: DS.text }}>
      <PageHeader
        eyebrow="Instructor Portal"
        title="My Learners"
        sub={`${learners.length} learners · ${onTrack} on track · ${highRisk} need attention`}
        actions={
          <div className="flex gap-2">
            <Link href="/assessments/bulk"
              className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
              Capture Marks
            </Link>
            <Link href="/attendance"
              className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ background: DS.text, color: 'white' }}>
              Mark Attendance
            </Link>
          </div>
        }
      />

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: `${learners.length} Total`,  color: DS.primary,  bg: DS.primaryLight,  border: DS.primaryBorder },
          { label: `${onTrack} On Track`,        color: DS.success,  bg: DS.successLight,  border: '#A7F3D0' },
          { label: `${learners.filter((l:any)=>l.risk==='medium').length} Monitoring`, color: DS.warn, bg: DS.warnLight, border: '#FDE68A' },
          { label: `${highRisk} High Risk`,      color: DS.danger,   bg: DS.dangerLight,   border: '#FECACA' },
        ].map(({ label, color, bg, border }) => (
          <span key={label} className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: bg, color, border: `1px solid ${border}` }}>
            {label}
          </span>
        ))}
      </div>

      {learners.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <p className="text-4xl mb-3">👩‍🎓</p>
          <p className="font-semibold" style={{ color: '#64748B' }}>No learners enrolled yet</p>
          <p className="text-sm mt-1" style={{ color: DS.textMuted }}>Learners will appear once enrolled in your programmes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {learners.map((l: any) => {
            const riskCfg = RISK_CFG[l.risk as keyof typeof RISK_CFG] || RISK_CFG.low;
            return (
              <Link key={l.learner_id} href={`/learners/${l.learner_id}`}
                className="block rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: DS.surface, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {l.learner_profiles?.avatar_url ? (
                        <img src={l.learner_profiles.avatar_url} alt={l.initials}
                          className="w-11 h-11 rounded-xl object-cover" style={{ border: `2px solid ${DS.borderLight}` }} />
                      ) : (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                          style={{ background: `linear-gradient(135deg,${DS.primary},#7C3AED)` }}>
                          {l.initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: DS.text }}>
                          {l.learner_profiles?.first_name} {l.learner_profiles?.last_name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
                          {l.learner_code} · Grade {l.grade}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: riskCfg.bg, color: riskCfg.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskCfg.dot }} />
                      {riskCfg.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs font-medium truncate" style={{ color: '#475569' }}>
                      {l.schools?.school_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: DS.primaryLight, color: DS.primary }}>
                      {l.programme}
                    </span>
                  </div>
                </div>

                {/* Metric strip */}
                <div className="grid grid-cols-3 divide-x" style={{ borderTop: `1px solid ${DS.borderLight}`, borderColor: DS.borderLight }}>
                  {[
                    { label:'Att.',    value:`${l.att}%`,    color: l.att>=75?DS.success:DS.danger },
                    { label:'Score',   value:`${l.score}%`,  color: scoreColor(l.score) },
                    { label:'Projects',value: l.doneProj,    color: '#7C3AED' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="px-3 py-3 text-center" style={{ borderColor: DS.borderLight }}>
                      <p className="text-base font-black tabular-nums" style={{ color }}>{value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: DS.textMuted }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="px-5 py-4 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: DS.textMuted }}>Attendance</span>
                      <span className="font-semibold" style={{ color: l.att>=75?DS.success:DS.danger }}>{l.att}%</span>
                    </div>
                    <ProgressBar value={l.att} color={l.att>=75?DS.success:DS.danger} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: DS.textMuted }}>Academic Score</span>
                      <span className="font-semibold" style={{ color: scoreColor(l.score) }}>{l.score}%</span>
                    </div>
                    <ProgressBar value={l.score} color={scoreColor(l.score)} />
                  </div>
                </div>

                <div className="px-5 pb-4 flex items-center justify-between">
                  <span className="text-xs" style={{ color: DS.textMuted }}>{l.schools?.school_name}</span>
                  <span className="text-xs font-semibold" style={{ color: DS.primary }}>View Profile →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
