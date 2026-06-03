'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, UserCheck, UserX } from 'lucide-react';
import { fmt } from '@/utils';

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
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
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
    <div className={`text-center py-10 rounded-xl border ${
      section === 'pending'
        ? 'bg-gray-50 border-gray-200'
        : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <CheckCircle2 className="w-10 h-10 text-mint-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500">
        {section === 'pending' ? 'No pending registrations.' : 'No active teachers yet.'}
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      {users.map(u => (
        <div key={u.user_id}
          className={`rounded-xl border shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap ${
            section === 'pending'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-gray-100'
          }`}>

          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
              section === 'pending' ? 'bg-amber-500' : 'bg-brand-700'
            }`}>
              {u.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800">{u.full_name}</p>
              <p className="text-sm text-gray-500 truncate">{u.email}</p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                <span>🏫 {u.school_name}</span>
                <span>📅 {fmt.date(u.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            {section === 'pending' ? (
              <>
                <button
                  onClick={() => handleReject(u.user_id)}
                  disabled={!!loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium bg-white hover:bg-red-50 transition-colors disabled:opacity-50">
                  {loading === u.user_id + '_reject'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(u.user_id)}
                  disabled={!!loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors disabled:opacity-50 shadow-sm">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
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
