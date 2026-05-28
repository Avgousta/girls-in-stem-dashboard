'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const params     = useSearchParams();
  const redirectTo = params.get('redirectTo') || '/dashboard';
  const errorParam = params.get('error');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      toast.error('Login succeeded but no session returned. Check your Supabase project settings.');
      setLoading(false);
      return;
    }

    // Fetch role then redirect to the correct dashboard
    const profileRes = await fetch('/api/v1/auth/me');
    const profile    = await profileRes.json();
    const role       = profile?.data?.role;

    let dest = '/dashboard';
    if (role === 'learner')    dest = '/student';
    if (role === 'instructor') dest = '/teacher';
    if (role === 'sponsor')    dest = '/sponsor';
    if (redirectTo && redirectTo !== '/dashboard') dest = redirectTo;

    window.location.href = dest;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-mint-400/20 mb-4">
            <GraduationCap className="w-8 h-8 text-mint-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Girls in STEM</h1>
          <p className="text-brand-200 mt-1">Digital Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {errorParam === 'pending_approval' && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
              ⏳ Your teacher account is pending approval by an administrator. You'll be notified once approved.
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="form-label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="form-input" placeholder="you@girlsstem.org" required autoFocus />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="form-input" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-500 text-center">
              Forgot your password?{' '}
              <a href="/forgot-password" className="text-brand-700 font-medium hover:underline">Reset it here</a>
            </p>
            <p className="text-xs text-gray-500 text-center">
              Don't have an account?{' '}
              <a href="/register" className="text-brand-700 font-medium hover:underline">Register here</a>
            </p>
          </div>
        </div>

        <div className="mt-4 bg-white/10 rounded-xl p-4 text-center">
          <p className="text-brand-200 text-xs font-medium mb-2">Demo credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/80">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="font-semibold">Admin</div>
              <div>admin@girlsstem.org</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="font-semibold">Instructor</div>
              <div>instructor@girlsstem.org</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
