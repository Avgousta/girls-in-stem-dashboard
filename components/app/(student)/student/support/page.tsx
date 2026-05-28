import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ActivityTimeline } from '@/components/interventions/InterventionBadges';
import { fmt } from '@/utils';

const TYPE_LABEL: Record<string,string> = {
  academic:'📚 Academic Support', attendance:'📅 Attendance',
  behavioural:'⚠️ Behavioural', personal:'💬 Personal',
  technical:'💻 Technical', other:'📋 General Support',
};

export default async function StudentSupportPage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learnerRow } = await supabase
    .from('learners').select('learner_id').eq('user_id', user.user_id).single();
  const learnerId = (learnerRow as any)?.learner_id;

  if (!learnerId) return (
    <div className="text-center py-16">
      <p className="text-white/50 font-semibold">Learner profile not linked.</p>
    </div>
  );

  const { data: interventions } = await supabase
    .from('interventions')
    .select(`
      intervention_id, intervention_type, status, created_at, resolved_at,
      reason, action_plan,
      assigned_user:users!assigned_to(full_name),
      intervention_updates(update_id, note, status_change, created_at,
        author:users!author_id(full_name))
    `)
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });

  const items    = interventions || [];
  const open     = items.filter((i: any) => i.status !== 'resolved');
  const resolved = items.filter((i: any) => i.status === 'resolved');

  return (
    <div className="space-y-6 pt-1">
      <div>
        <h1 className="text-2xl font-black text-white">My Support ❤️</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {open.length > 0 ? `${open.length} active support item${open.length!==1?'s':''}` : 'All clear — great work!'}
        </p>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-4xl mb-3">✅</p>
          <p className="text-white/60 font-semibold">No support items on record</p>
          <p className="text-sm text-white/30 mt-1">If you need help, speak to your instructor</p>
        </div>
      )}

      {open.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Active Support</p>
          <div className="space-y-3">
            {open.map((item: any) => {
              const updates = (item.intervention_updates || [])
                .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
              const entries = [
                { label:'Support started', sub: fmt.date(item.created_at), color:'#94A3B8' },
                ...updates.map((u: any) => ({
                  label: u.status_change ? `Update: ${u.status_change}` : u.note,
                  sub:   `${u.author?.full_name || '—'} · ${fmt.date(u.created_at)}`,
                  color: u.status_change ? '#1D4ED8' : '#10B981',
                })),
              ];
              const statusColor = { open:'#DC2626', in_progress:'#1D4ED8', resolved:'#16A34A' }[item.status as string] || '#DC2626';
              const statusBg    = { open:'#FEF2F2', in_progress:'#EFF6FF', resolved:'#F0FDF4' }[item.status as string] || '#FEF2F2';
              const statusLabel = { open:'Active', in_progress:'In Progress', resolved:'Resolved' }[item.status as string] || item.status;
              return (
                <div key={item.intervention_id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{TYPE_LABEL[item.intervention_type] || '📋 Support'}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.reason}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{ background:statusBg, color:statusColor }}>{statusLabel}</span>
                    </div>
                    {item.action_plan && (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">What your team is doing</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.action_plan}</p>
                      </div>
                    )}
                    {(item.assigned_user as any)?.full_name && (
                      <p className="text-xs text-gray-400 mt-2">
                        👤 <strong>{(item.assigned_user as any).full_name}</strong> is supporting you
                      </p>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Progress</p>
                    <ActivityTimeline entries={entries} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="opacity-60">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Resolved ({resolved.length})</p>
          <div className="space-y-2">
            {resolved.map((item: any) => (
              <div key={item.intervention_id} className="bg-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm">
                <span className="text-xl shrink-0">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{TYPE_LABEL[item.intervention_type]||'Support'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.reason}</p>
                </div>
                {item.resolved_at && <p className="text-xs text-gray-400 shrink-0">{fmt.date(item.resolved_at)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-5 text-center"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-2xl mb-2">🙋‍♀️</p>
        <p className="text-white/70 font-semibold text-sm">Need help?</p>
        <p className="text-white/35 text-xs mt-1">Speak to your instructor or mentor — they're here for you.</p>
      </div>
    </div>
  );
}
