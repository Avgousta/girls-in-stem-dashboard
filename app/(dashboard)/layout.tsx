import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import PlatformShell from '@/components/platform/PlatformShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user     = await requireAuth();
  const supabase = await createClient();

  let pendingApprovals = 0;
  if (user.role === 'admin') {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'instructor')
      .eq('is_active', false);
    pendingApprovals = count || 0;
  }

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user_id)
    .eq('is_read', false);

  let openInterventions = 0;
  if (user.role === 'instructor') {
    const { count } = await supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true })
      .eq('flagged_by', user.user_id)
      .eq('status', 'open');
    openInterventions = count || 0;
  }

  return (
    <PlatformShell
      role={user.role === 'admin' ? 'admin' : 'instructor'}
      userName={user.full_name}
      pendingApprovals={pendingApprovals}
      unreadNotifications={unreadCount || 0}
      openInterventions={openInterventions}>
      {children}
    </PlatformShell>
  );
}
