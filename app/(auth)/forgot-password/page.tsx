'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, GraduationCap, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Enter your email address'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw new Error(error.message);
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-400/20 mb-3">
            <GraduationCap className="w-7 h-7 text-mint-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Girls in STEM</h1>
          <p className="text-brand-200 text-sm">Password Reset</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-mint-400/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-mint-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Check your inbox</h2>
                <p className="text-gray-500 text-sm mt-2">
                  We sent a password reset link to <strong>{email}</strong>.
                  Check your email and click the link to reset your password.
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Didn't get it? Check your spam folder.
                </p>
              </div>
              <Link href="/login" className="btn-secondary w-full justify-center">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Forgot your password?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="form-input pl-10" placeholder="you@school.edu.za"
                      autoFocus />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                <Link href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
