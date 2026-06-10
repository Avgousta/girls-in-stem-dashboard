'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function LoginInner() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
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

    // Query role directly via the browser client — it already has the session,
    // so no server round-trip cookie timing issue.
    let dest = '/dashboard';
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      const role = profile?.role;
      if (role === 'learner')    dest = '/student';
      if (role === 'instructor') dest = '/teacher';
      if (role === 'sponsor')    dest = '/sponsor';
      if (role === 'admin')      dest = '/dashboard';

      // Honour an explicit redirectTo unless it points back to login
      if (redirectTo && redirectTo !== '/login' && redirectTo !== '/') {
        dest = redirectTo;
      }
    } catch {
      // Fall back to /dashboard — the layout will re-check auth and route accordingly
    }

    window.location.href = dest;
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-16"
      style={{
        background: 'linear-gradient(160deg, #0F0820 0%, #1C0B38 50%, #2D1B4E 100%)',
        fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
      }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(124,58,237,0.4) 0%, transparent 60%)' }}
      />
      {/* Bottom mint glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ width: '500px', height: '200px', background: 'radial-gradient(ellipse at center, rgba(45,212,160,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-3 mb-6 group">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-opacity group-hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', boxShadow: '0 0 24px rgba(124,58,237,0.5)' }}
            >
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold text-white">Girls in STEM</span>
              <span className="block text-xs font-medium" style={{ color: 'rgba(167,139,250,0.8)' }}>Melisizwe Programme</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Sign in to your portal to continue
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}
        >
          {/* Pending approval warning */}
          {errorParam === 'pending_approval' && (
            <div
              className="mb-6 rounded-xl p-4 text-sm"
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#FCD34D',
              }}
            >
              ⏳ Your teacher account is pending approval by an administrator. You&apos;ll be notified once approved.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@girlsstem.org"
                required
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  caretColor: '#A78BFA',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium transition-colors hover:text-white" style={{ color: '#A78BFA' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    caretColor: '#A78BFA',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                boxShadow: '0 0 24px rgba(124,58,237,0.45)',
              }}
              onMouseOver={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : <>Sign in <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></>
              }
            </button>
          </form>

          {/* Register link */}
          <p className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold transition-colors hover:text-white" style={{ color: '#A78BFA' }}>
              Register here
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div
          className="mt-4 rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.7)' }}>
            Demo credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'Admin', email: 'admin@girlsstem.org' },
              { role: 'Instructor', email: 'instructor@girlsstem.org' },
            ].map(({ role, email: demoEmail }) => (
              <button
                key={role}
                type="button"
                onClick={() => { setEmail(demoEmail); setPassword('password'); }}
                className="rounded-lg p-2.5 text-left text-xs transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <div className="font-bold text-white">{role}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>{demoEmail}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Back to home */}
        <p className="mt-6 text-center text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
          <Link href="/" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
