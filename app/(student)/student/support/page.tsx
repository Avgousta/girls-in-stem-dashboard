import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ActivityTimeline } from '@/components/interventions/InterventionBadges';
import { fmt } from '@/utils';

const t = {
  text:   'var(--t-text)',
  muted:  'var(--t-muted)',
  card:   'var(--t-card)',
  border: '1px solid var(--t-border)',
};

const TYPE_LABEL: Record<string,string> = {
  academic:    '📚 Academic Support',
  attendance:  '📅 Attendance',
  behavioural: '⚠️ Behavioural',
  personal:    '💬 Personal',
  technical:   '💻 Technical',
  other:       '📋 General Support',
};

export default async function StudentSupportPage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learnerRow } = await supabase
    .from('learners').select('learner_id').eq('user_id', user.user_id).single();
  const learnerId = (learnerRow as any)?.learner_id;

  if (!learnerId) return (
    <div className="text-center py-16">
      <p className="font-semibold" style={{ color: t.muted }}>Learner profile not linked.</p>
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
        <h1 className="text-2xl font-black" style={{ color: t.text }}>My Support ❤️</h1>
        <p className="text-sm mt-0.5" style={{ color: t.muted }}>
          {open.length > 0
            ? `${open.length} active support item${open.length!==1?'s':''}`
            : 'All clear — great work!'}
        </p>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ background: t.card, border: t.border }}>
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold" style={{ color: t.muted }}>No support items on record</p>
          <p className="text-sm mt-1" style={{ color: t.muted }}>If you need help, speak to your instructor</p>
        </div>
      )}

      {/* Active items */}
      {open.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: t.muted }}>Active Support</p>
          <div className="space-y-3">
            {open.map((item: any) => {
              const updates = (item.intervention_updates || [])
                .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
              const entries = [
                { label: 'Support started', sub: fmt.date(item.created_at), color: '#94A3B8' },
                ...updates.map((u: any) => ({
                  label: u.status_change ? `Update: ${u.status_change}` : u.note,
                  sub:   `${u.author?.full_name || '—'} · ${fmt.date(u.created_at)}`,
                  color: u.status_change ? '#60A5FA' : '#2DD4A0',
                })),
              ];
              const statusColor = { open:'#EF4444', in_progress:'#60A5FA', resolved:'#2DD4A0' }[item.status as string] || '#EF4444';
              const statusBg    = { open:'rgba(239,68,68,0.12)', in_progress:'rgba(96,165,250,0.12)', resolved:'rgba(45,212,160,0.12)' }[item.status as string] || 'rgba(239,68,68,0.12)';
              const statusLabel = { open:'Active', in_progress:'In Progress', resolved:'Resolved' }[item.status as string] || item.status;

              return (
                <div key={item.intervention_id} className="rounded-2xl overflow-hidden"
                  style={{ background: t.card, border: t.border }}>
                  <div className="px-5 py-4" style={{ borderBottom: t.border }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: t.text }}>{TYPE_LABEL[item.intervention_type] || '📋 Support'}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.muted }}>{item.reason}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>
                    </div>
                    {item.action_plan && (
                      <div className="mt-3 p-3 rounded-xl"
                        style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A78BFA' }}>What your team is doing</p>
                        <p className="text-sm leading-relaxed" style={{ color: t.text }}>{item.action_plan}</p>
                      </div>
                    )}
                    {(item.assigned_user as any)?.full_name && (
                      <p className="text-xs mt-2" style={{ color: t.muted }}>
                        👤 <strong style={{ color: t.text }}>{(item.assigned_user as any).full_name}</strong> is supporting you
                      </p>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: t.muted }}>Progress</p>
                    <ActivityTimeline entries={entries} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved items */}
      {resolved.length > 0 && (
        <div className="opacity-70">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: t.muted }}>
            Resolved ({resolved.length})
          </p>
          <div className="space-y-2">
            {resolved.map((item: any) => (
              <div key={item.intervention_id} className="rounded-2xl px-5 py-4 flex items-center gap-3"
                style={{ background: t.card, border: t.border }}>
                <span className="text-xl shrink-0">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: t.text }}>{TYPE_LABEL[item.intervention_type]||'Support'}</p>
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: t.muted }}>{item.reason}</p>
                </div>
                {item.resolved_at && (
                  <p className="text-xs shrink-0" style={{ color: t.muted }}>{fmt.date(item.resolved_at)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Need help callout */}
      <div className="rounded-2xl p-5 text-center" style={{ background: t.card, border: t.border }}>
        <p className="text-2xl mb-2">🙋‍♀️</p>
        <p className="font-semibold text-sm" style={{ color: t.text }}>Need help?</p>
        <p className="text-xs mt-1" style={{ color: t.muted }}>Speak to your instructor or mentor — they're here for you.</p>
      </div>
    </div>
  );
}
