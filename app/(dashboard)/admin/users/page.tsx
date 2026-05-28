import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import UsersManager from './UsersManager';
import { Users } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-700" /> User Management
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {(users || []).length} users · manage accounts, roles and access
        </p>
      </div>
      <UsersManager users={(users || []).map((u: any) => ({
        ...u,
        school_name:   u.schools?.school_name   || '—',
        sponsor_name:  u.sponsors?.sponsor_name || '—',
      }))} />
    </div>
  );
}
