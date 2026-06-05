import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ApprovalList from './ApprovalList';
import { UserCheck } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

export default async function ApprovalsPage() {
  await requireAuth(['admin']);
  const supabase = await createClient();

  const { data: all } = await supabase
    .from('users')
    .select('*, schools(school_name)')
    .eq('role', 'instructor')
    .order('created_at', { ascending: false });

  const pending = (all || []).filter((u: any) => !u.is_active);
  const active  = (all || []).filter((u: any) => u.is_active);

  const mapUser = (u: any) => ({ ...u, school_name: u.schools?.school_name || '—' });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
            <UserCheck className="w-6 h-6" style={{ color: DS.primary }} /> Teacher Approvals
          </h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
            Manage teacher account registrations
          </p>
        </div>
        {pending.length > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full animate-pulse"
            style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
            {pending.length} pending
          </span>
        )}
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
          style={{ color: DS.textMuted }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--ds-warn)' }} />
          Awaiting Approval ({pending.length})
        </h2>
        <ApprovalList users={pending.map(mapUser)} section="pending" />
      </div>

      {active.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: DS.textMuted }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--ds-success)' }} />
            Active Teachers ({active.length})
          </h2>
          <ApprovalList users={active.map(mapUser)} section="active" />
        </div>
      )}
    </div>
  );
}
