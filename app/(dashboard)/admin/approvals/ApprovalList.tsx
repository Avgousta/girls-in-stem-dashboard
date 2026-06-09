'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, UserCheck, UserX } from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';

interface User {
  user_id:     string;
  full_name:   string;
  email:       string;
  school_name: string;
  created_at:  string;
  is_active:   boolean;
}

interface Props {
  users:   User[];
  section: 'pending' | 'active';
}

export default function ApprovalList({ users: initial, section }: Props) {
  const [users,   setUsers]   = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setLoading(userId);
    try {
      const res = await fetch(`/api/v1/users/${userId}/approve`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to approve');
      toast.success('Teacher approved — they can now sign in');
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e) || 'Failed to approve');
    } finally {
      setLoading(null);
    }
  };

  const handleDeactivate = async (userId: string) => {
    setLoading(userId + '_deact');
    try {
      const res = await fetch(`/api/v1/users/${userId}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Teacher account deactivated');
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch {
      toast.error('Failed to deactivate');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setLoading(userId + '_reject');
    try {
      const res = await fetch(`/api/v1/users/${userId}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Registration rejected');
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch {
      toast.error('Failed to reject');
    } finally {
      setLoading(null);
    }
  };

  if (users.length === 0) return (
    <div className="text-center py-10 rounded-2xl" style={{
      background: DS.surface, border: `1px solid ${DS.border}`,
    }}>
      <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--ds-success)' }} />
      <p className="text-sm" style={{ color: DS.textMuted }}>
        {section === 'pending' ? 'No pending registrations.' : 'No active teachers yet.'}
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      {users.map(u => (
        <div key={u.user_id}
          className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
          style={section === 'pending'
            ? { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }
            : { background: DS.surface as string, border: `1px solid ${DS.border}` }}>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: section === 'pending' ? '#F59E0B' : DS.primary as string }}>
              {u.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold" style={{ color: DS.text }}>{u.full_name}</p>
              <p className="text-sm truncate" style={{ color: DS.textMuted }}>{u.email}</p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: DS.textMuted }}>
                <span>🏫 {u.school_name}</span>
                <span>📅 {fmt.date(u.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {section === 'pending' ? (
              <>
                <button
                  onClick={() => handleReject(u.user_id)}
                  disabled={!!loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                  style={{ border: '1px solid var(--ds-danger)', color: 'var(--ds-danger)', background: 'var(--ds-danger-light)' }}>
                  {loading === u.user_id + '_reject'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(u.user_id)}
                  disabled={!!loading}
                  className="btn-primary text-sm disabled:opacity-50">
                  {loading === u.user_id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <UserCheck className="w-4 h-4" />}
                  Approve
                </button>
              </>
            ) : (
              <button
                onClick={() => handleDeactivate(u.user_id)}
                disabled={!!loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                style={{ border: `1px solid ${DS.border}`, color: DS.textMuted as string, background: DS.surfaceHover as string }}>
                {loading === u.user_id + '_deact'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <UserX className="w-4 h-4" />}
                Deactivate
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
