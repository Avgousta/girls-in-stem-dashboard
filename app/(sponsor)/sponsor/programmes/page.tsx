import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function SponsorProgrammesPage() {
  const user     = await requireAuth(['sponsor']);
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('sponsor_learners').select('learner_id').eq('sponsor_id', user.sponsor_id);
  const ids = (links || []).map((l: any) => l.learner_id);

  if (!ids.length) return (
    <div className="text-center py-20 rounded-2xl" style={{ background: '#FFF', border: '1px solid #E2E8F0' }}>
      <p style={{ color: '#64748B' }}>No learners linked yet.</p>
    </div>
  );

  const { data: enrollments } = await supabase
    .from('program_enrollments')
    .select('learner_id, status, programs(program_id, program_name, program_type, description, is_active)')
    .in('learner_id', ids)
    .eq('status', 'active');

  // Group by programme
  const progMap: Record<string, { prog: any; learnerIds: Set<string> }> = {};
  (enrollments || []).forEach((e: any) => {
    const pid = e.programs?.program_id;
    if (!pid) return;
    if (!progMap[pid]) progMap[pid] = { prog: e.programs, learnerIds: new Set() };
    progMap[pid].learnerIds.add(e.learner_id);
  });

  // Get assessment stats per programme
  const progList = await Promise.all(
    Object.entries(progMap).map(async ([pid, { prog, learnerIds }]) => {
      const lids = [...learnerIds];
      const [attRes, assRes, projRes] = await Promise.all([
        supabase.from('attendance').select('status').in('learner_id', lids).eq('program_id', pid),
        supabase.from('assessments').select('percentage, grade_band').in('learner_id', lids).eq('program_id', pid),
        supabase.from('projects').select('stage, completion_status').in('learner_id', lids).eq('program_id', pid),
      ]);
      const att      = attRes.data || [];
      const ass      = assRes.data || [];
      const proj     = projRes.data || [];
      const attRate  = att.length ? Math.round(att.filter((a: any)=>a.status==='present').length/att.length*100) : 0;
      const avgScore = ass.length ? Math.round(ass.reduce((s: number,a: any)=>s+Number(a.percentage||0),0)/ass.length) : 0;
      const done     = proj.filter((p: any)=>['marked','completed'].includes(p.stage||p.completion_status||'')).length;
      return { prog, learnerCount: lids.length, attRate, avgScore, done, assCount: ass.length, projCount: proj.length };
    })
  );

  const TYPE_ICONS: Record<string, string> = {
    'STEM':'🔬','Coding':'💻','Robotics':'🤖','After-School':'📚','Hybrid':'🌐',
    'Mathematics':'📐','Science':'🧪','Engineering':'⚙️','Design':'🎨',
  };

  const scoreColor = (v: number) => v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-8" style={{ color: '#0F172A' }}>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1D4ED8' }}>Programme Overview</p>
        <h1 className="text-3xl font-black tracking-tight">Programmes</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          {progList.length} programme{progList.length!==1?'s':''} your learners are enrolled in
        </p>
      </div>

      {progList.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#FFF', border: '1px solid #E2E8F0' }}>
          <p style={{ color: '#94A3B8' }}>No programme data yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {progList.sort((a,b)=>b.learnerCount-a.learnerCount).map(({ prog, learnerCount, attRate, avgScore, done, assCount, projCount }) => (
            <div key={prog.program_id} className="rounded-2xl overflow-hidden"
              style={{ background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

              {/* Header */}
              <div className="px-6 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    {TYPE_ICONS[prog.program_type] || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold truncate" style={{ color: '#0F172A' }}>{prog.program_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={{ background: '#EFF6FF', color: '#1D4ED8' }}>{prog.program_type}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={{ background: prog.is_active ? '#ECFDF5' : '#F8FAFC', color: prog.is_active ? '#059669' : '#94A3B8' }}>
                        {prog.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {prog.description && (
                      <p className="text-xs mt-2 line-clamp-2" style={{ color: '#64748B' }}>{prog.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 divide-x" style={{ borderBottom: '1px solid #F1F5F9' }}>
                {[
                  { label: 'Learners',   value: learnerCount,       color: '#1D4ED8' },
                  { label: 'Attendance', value: `${attRate}%`,      color: attRate>=75?'#10B981':'#EF4444' },
                  { label: 'Avg Score',  value: `${avgScore}%`,     color: scoreColor(avgScore) },
                  { label: 'Projects ✓', value: done,               color: '#7C3AED' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="px-4 py-4 text-center" style={{ borderColor: '#F1F5F9' }}>
                    <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: '#94A3B8' }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="px-6 py-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: '#94A3B8' }}>Attendance</span>
                    <span className="font-semibold" style={{ color: attRate>=75?'#10B981':'#EF4444' }}>{attRate}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${attRate}%`, background: attRate>=75?'#10B981':'#EF4444' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: '#94A3B8' }}>Academic Performance</span>
                    <span className="font-semibold" style={{ color: scoreColor(avgScore) }}>{avgScore}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${avgScore}%`, background: scoreColor(avgScore) }} />
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <p className="text-xs" style={{ color: '#CBD5E1' }}>
                  {assCount} assessment{assCount!==1?'s':''} recorded &nbsp;·&nbsp; {projCount} project{projCount!==1?'s':''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
