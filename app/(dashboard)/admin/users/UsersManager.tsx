'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Search, Shield, UserX, UserCheck } from 'lucide-react';
import { fmt } from '@/utils';
import { cn } from '@/utils';

interface User {
  user_id: string; full_name: string; email: string; role: string;
  is_active: boolean; created_at: string; last_login: string | null;
  school_name: string; sponsor_name: string; phone: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-brand-100 text-brand-800',
  instructor: 'bg-blue-100 text-blue-800',
  learner:    'bg-mint-400/10 text-mint-700',
  parent:     'bg-purple-100 text-purple-800',
  sponsor:    'bg-amber-100 text-amber-800',
};

export default function UsersManager({ users: initial }: { users: User[] }) {
  const [users,   setUsers]   = useState(initial);
  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = !role || u.role === role;
    return matchSearch && matchRole;
  });

  const toggleActive = async (userId: string, currentlyActive: boolean) => {
    setLoading(userId);
    try {
      const endpoint = currentlyActive ? 'reject' : 'approve';
      const res = await fetch(`/api/v1/users/${userId}/${endpoint}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: !currentlyActive } : u));
      toast.success(currentlyActive ? 'Account deactivated' : 'Account activated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setLoading(null);
    }
  };

  const roles = ['admin', 'instructor', 'learner', 'parent', 'sponsor'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…" className="form-input pl-9 py-2 w-full text-sm" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} className="form-select py-2 w-auto text-sm">
          <option value="">All roles</option>
          {roles.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{filtered.length}</span> users
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {roles.map(r => {
          const count = users.filter(u => u.role === r).length;
          return (
            <div key={r} className={`rounded-xl p-3 text-center border border-gray-100 cursor-pointer hover:shadow-sm transition-shadow ${role === r ? 'ring-2 ring-brand-500' : ''}`}
              onClick={() => setRole(role === r ? '' : r)}>
              <p className="text-xl font-bold text-gray-800">{count}</p>
              <p className={`text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full inline-block capitalize ${ROLE_COLORS[r] || 'bg-gray-100 text-gray-600'}`}>{r}</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr key="hdr">
              <th key="name">Name</th>
              <th key="email">Email</th>
              <th key="role">Role</th>
              <th key="school">School / Sponsor</th>
              <th key="joined">Joined</th>
              <th key="status">Status</th>
              <th key="action">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.user_id || i}
                className={!u.is_active ? 'opacity-60 bg-gray-50/50' : ''}>
                <td key="name">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">{u.full_name}</p>
                  </div>
                </td>
                <td key="email" className="text-gray-500 text-xs">{u.email}</td>
                <td key="role">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>
                    {u.role}
                  </span>
                </td>
                <td key="school" className="text-xs text-gray-500">
                  {u.role === 'sponsor' ? u.sponsor_name : u.school_name}
                </td>
                <td key="joined" className="text-xs text-gray-400">{fmt.date(u.created_at)}</td>
                <td key="status">
                  {u.is_active
                    ? <span className="flex items-center gap-1 text-xs text-mint-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Active</span>
                    : <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="w-3.5 h-3.5" />Inactive</span>}
                </td>
                <td key="action">
                  <button
                    onClick={() => toggleActive(u.user_id, u.is_active)}
                    disabled={loading === u.user_id}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors',
                      u.is_active
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-mint-400/30 text-mint-700 hover:bg-mint-50'
                    )}>
                    {loading === u.user_id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No users match your filters.</div>
        )}
      </div>
    </div>
  );
}
