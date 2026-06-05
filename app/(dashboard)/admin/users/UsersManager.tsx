'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Search, UserX, UserCheck } from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';

interface User {
  user_id: string; full_name: string; email: string; role: string;
  is_active: boolean; created_at: string; last_login: string | null;
  school_name: string; sponsor_name: string; phone: string | null;
}

const ROLE_STYLE: Record<string, { color: string; bg: string }> = {
  admin:      { color: DS.primary as string,   bg: DS.primaryLight as string   },
  instructor: { color: '#2563EB',              bg: 'rgba(37,99,235,0.12)'      },
  learner:    { color: 'var(--ds-success)',    bg: 'var(--ds-success-light)'   },
  parent:     { color: '#7C3AED',              bg: 'rgba(124,58,237,0.12)'     },
  sponsor:    { color: '#D97706',              bg: 'rgba(217,119,6,0.12)'      },
};

const thSt: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
};
const selectSt: React.CSSProperties = {
  background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '7px 10px', fontSize: '13px', outline: 'none', width: 'auto',
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
      <div className="rounded-2xl p-4 flex flex-wrap gap-3" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…" className="form-input pl-9 py-2 w-full text-sm" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} style={selectSt}>
          <option value="">All roles</option>
          {roles.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm" style={{ color: DS.textMuted }}>
          <span className="font-semibold" style={{ color: DS.text }}>{filtered.length}</span> users
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {roles.map(r => {
          const count = users.filter(u => u.role === r).length;
          const st = ROLE_STYLE[r] || { color: DS.textMid as string, bg: DS.surfaceHover as string };
          return (
            <div key={r}
              className="rounded-2xl p-3 text-center cursor-pointer transition-all"
              style={{
                background: role === r ? st.bg : DS.surface as string,
                border: role === r ? `2px solid ${st.color}` : `1px solid ${DS.border}`,
              }}
              onClick={() => setRole(role === r ? '' : r)}>
              <p className="text-xl font-bold" style={{ color: role === r ? st.color : DS.text as string }}>{count}</p>
              <p className="text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full inline-block capitalize"
                style={{ background: st.bg, color: st.color }}>{r}</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Name','Email','Role','School / Sponsor','Joined','Status','Action'].map(h => (
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.user_id || i}
                style={{
                  borderBottom: `1px solid ${DS.borderLight}`,
                  opacity: u.is_active ? 1 : 0.55,
                  background: u.is_active ? 'transparent' : DS.surfaceHover as string,
                }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: DS.primary }}>
                      {u.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <p className="font-semibold text-sm" style={{ color: DS.text }}>{u.full_name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{u.email}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const st = ROLE_STYLE[u.role] || { color: DS.textMid as string, bg: DS.surfaceHover as string };
                    return (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: st.bg, color: st.color }}>{u.role}</span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>
                  {u.role === 'sponsor' ? u.sponsor_name : u.school_name}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{fmt.date(u.created_at)}</td>
                <td className="px-4 py-3">
                  {u.is_active
                    ? <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ds-success)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" />Active
                      </span>
                    : <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ds-danger)' }}>
                        <XCircle className="w-3.5 h-3.5" />Inactive
                      </span>}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(u.user_id, u.is_active)}
                    disabled={loading === u.user_id}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                    style={u.is_active
                      ? { border: '1px solid var(--ds-danger)', color: 'var(--ds-danger)', background: 'var(--ds-danger-light)' }
                      : { border: '1px solid var(--ds-success)', color: 'var(--ds-success)', background: 'var(--ds-success-light)' }}>
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
          <div className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>No users match your filters.</div>
        )}
      </div>
    </div>
  );
}
