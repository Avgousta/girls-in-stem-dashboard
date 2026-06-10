'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Search, UserX, UserCheck, UserPlus, X } from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';

interface User {
  user_id: string; full_name: string; email: string; role: string;
  is_active: boolean; created_at: string; last_login: string | null;
  school_name: string; sponsor_name: string; phone: string | null;
}

interface School { school_id: string; school_name: string }

const ROLES = ['admin', 'instructor', 'learner', 'sponsor', 'parent'] as const;
type Role = typeof ROLES[number];

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
const inputSt: React.CSSProperties = {
  background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '8px 12px', fontSize: '13px', outline: 'none', colorScheme: 'dark', width: '100%',
};
const selectSt: React.CSSProperties = { ...inputSt };

const BLANK_FORM = { full_name: '', email: '', password: '', role: 'instructor' as Role, school_id: '', phone: '' };

export default function UsersManager({ users: initial, schools }: { users: User[]; schools: School[] }) {
  const [users,    setUsers]   = useState(initial);
  const [search,   setSearch]  = useState('');
  const [roleF,    setRoleF]   = useState('');
  const [loading,  setLoading] = useState<string | null>(null);
  const [showAdd,  setShowAdd] = useState(false);
  const [saving,   setSaving]  = useState(false);
  const [form,     setForm]    = useState(BLANK_FORM);
  const [showPw,   setShowPw]  = useState(false);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = !roleF || u.role === roleF;
    return matchSearch && matchRole;
  });

  const set = (k: keyof typeof BLANK_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));

  const closeAdd = () => { setShowAdd(false); setForm(BLANK_FORM); setShowPw(false); };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {
        full_name: form.full_name,
        email:     form.email,
        password:  form.password,
        role:      form.role,
      };
      if (form.school_id) body.school_id = form.school_id;
      if (form.phone)     body.phone     = form.phone;

      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed to create user'); return; }

      // Find school name from school_id for display
      const school = schools.find(s => s.school_id === form.school_id);
      const newUser: User = {
        ...json.data,
        school_name:  school?.school_name || '—',
        sponsor_name: '—',
        last_login:   null,
      };
      setUsers(prev => [newUser, ...prev]);
      toast.success(`${form.full_name} added successfully`);
      closeAdd();
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

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

  const needsSchool = form.role === 'instructor' || form.role === 'learner';

  return (
    <div className="space-y-4">
      {/* Filters + Add button */}
      <div className="rounded-2xl p-4 flex flex-wrap gap-3" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…" className="form-input pl-9 py-2 w-full text-sm" />
        </div>
        <select value={roleF} onChange={e => setRoleF(e.target.value)} style={{ ...inputSt, width: 'auto' }}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm" style={{ color: DS.textMuted }}>
          <span className="font-semibold" style={{ color: DS.text }}>{filtered.length}</span> users
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          style={{ background: DS.primary as string, color: '#fff' }}>
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {ROLES.map(r => {
          const count = users.filter(u => u.role === r).length;
          const st = ROLE_STYLE[r] || { color: DS.textMid as string, bg: DS.surfaceHover as string };
          return (
            <div key={r} role="button" tabIndex={0}
              className="rounded-2xl p-3 text-center cursor-pointer transition-all"
              style={{
                background: roleF === r ? st.bg : DS.surface as string,
                border: roleF === r ? `2px solid ${st.color}` : `1px solid ${DS.border}`,
              }}
              onClick={() => setRoleF(roleF === r ? '' : r)}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setRoleF(roleF === r ? '' : r)}>
              <p className="text-xl font-bold" style={{ color: roleF === r ? st.color : DS.text as string }}>{count}</p>
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

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: DS.text }}>Add User</h2>
                <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>Create a new account with immediate access</p>
              </div>
              <button aria-label="Close" onClick={closeAdd} className="p-2 rounded-xl cursor-pointer" style={{ color: DS.textMuted }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={createUser} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: DS.textMid }}>Full name</label>
                <input required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="e.g. Carmen Dlamini" style={inputSt} />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: DS.textMid }}>Email address</label>
                <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="e.g. carmen@school.co.za" style={inputSt} />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: DS.textMid }}>Password</label>
                <div className="relative">
                  <input required type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Min 8 characters" style={{ ...inputSt, paddingRight: '40px' }} />
                  <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                    style={{ color: DS.textMuted }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ds-danger)' }}>At least 8 characters required</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: DS.textMid }}>Role</label>
                <select value={form.role} onChange={e => set('role', e.target.value as Role)} style={selectSt}>
                  {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>

              {/* School — shown for instructor + learner */}
              {needsSchool && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: DS.textMid }}>
                    School <span style={{ color: DS.textMuted }}>(optional)</span>
                  </label>
                  <select value={form.school_id} onChange={e => set('school_id', e.target.value)} style={selectSt}>
                    <option value="">— Select school —</option>
                    {schools.map(s => <option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}
                  </select>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: DS.textMid }}>
                  Phone <span style={{ color: DS.textMuted }}>(optional)</span>
                </label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="e.g. +27 82 000 0000" style={inputSt} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeAdd}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                  style={{ background: DS.surfaceHover as string, color: DS.textMid as string }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || form.password.length < 8}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: DS.primary as string, color: '#fff' }}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4" /> Create User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
