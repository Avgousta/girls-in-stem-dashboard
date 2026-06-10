'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, GraduationCap, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const DARK_BG = 'linear-gradient(160deg, #0F0820 0%, #1C0B38 50%, #2D1B4E 100%)';
const GLASS = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' };

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8)      { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm)      { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: DARK_BG, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: 'rgba(124,58,237,0.2)' }}>
            <GraduationCap className="w-7 h-7" style={{ color: '#A78BFA' }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Girls in STEM</h1>
        </div>

        <div className="rounded-2xl p-8" style={GLASS}>
          {done ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(52,211,153,0.15)' }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: '#34D399' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Password updated!</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(240,238,255,0.6)' }}>
                  You can now sign in with your new password.
                </p>
              </div>
              <Link href="/login" className="btn-primary w-full justify-center">Sign In</Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Set new password</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(240,238,255,0.6)' }}>
                  Choose a strong password for your account.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">New Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="form-input pr-10" placeholder="Min 8 characters" autoFocus />
                    <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(240,238,255,0.4)' }}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-xs mt-1" style={{ color: '#F87171' }}>At least 8 characters required</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    className="form-input" placeholder="Repeat password" />
                  {confirm && confirm !== password && (
                    <p className="text-xs mt-1" style={{ color: '#F87171' }}>Passwords don't match</p>
                  )}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
