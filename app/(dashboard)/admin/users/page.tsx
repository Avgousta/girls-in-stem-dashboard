import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import UsersManager from './UsersManager';
import { Users } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

export default async function AdminUsersPage() {
  await requireAuth(['admin']);
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('users')
    .select('*, schools(school_name), sponsors(sponsor_name)')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <Users className="w-6 h-6" style={{ color: DS.primary }} /> User Management
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
          {(users || []).length} users · manage accounts, roles and access
        </p>
      </div>
      <UsersManager users={((users || []) as unknown as Array<{ user_id:string; email:string; full_name:string; role:string; is_active:boolean; created_at:string; last_login:string|null; phone:string|null; schools:{school_name:string}|null; sponsors:{sponsor_name:string}|null }>).map(u => ({
        ...u,
        school_name:   u.schools?.school_name   || '—',
        sponsor_name:  u.sponsors?.sponsor_name || '—',
      }))} />
    </div>
  );
}
