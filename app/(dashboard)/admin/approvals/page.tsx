import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ApprovalList from './ApprovalList';
import { UserCheck } from 'lucide-react';

export default async function ApprovalsPage() {
  await requireAuth(['admin']);
  const supabase = await createClient();

  // Fetch ALL instructors so we can see both pending and active
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-700" /> Teacher Approvals
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage teacher account registrations
          </p>
        </div>
        {pending.length > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
            {pending.length} pending
          </span>
        )}
      </div>

      {/* Pending section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          Awaiting Approval ({pending.length})
        </h2>
        <ApprovalList users={pending.map(mapUser)} section="pending" />
      </div>

      {/* Active teachers */}
      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mint-500 inline-block" />
            Active Teachers ({active.length})
          </h2>
          <ApprovalList users={active.map(mapUser)} section="active" />
        </div>
      )}
    </div>
  );
}
