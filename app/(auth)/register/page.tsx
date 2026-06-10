'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, GraduationCap, BookOpen, UserCheck, Eye, EyeOff, Lock } from 'lucide-react';
import Link from 'next/link';

type Role = 'learner' | 'instructor';

const DARK_BG = 'linear-gradient(160deg, #0F0820 0%, #1C0B38 50%, #2D1B4E 100%)';
const GLASS   = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' };

// ─── Inner component (uses useSearchParams, must be inside Suspense) ──────────
function RegisterForm() {
  const searchParams  = useSearchParams();
  const codeFromUrl   = searchParams.get('code')?.toUpperCase() || '';

  const [role,          setRole]          = useState<Role>(codeFromUrl ? 'learner' : 'learner');
  const [step,          setStep]          = useState<1|2>(1);
  const [loading,       setLoading]       = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [done,          setDone]          = useState(false);
  const [lookingUp,     setLookingUp]     = useState(false);
  const [learnerName,   setLearnerName]   = useState('');

  const [form, setForm] = useState({
    full_name:    '',
    email:        '',
    password:     '',
    learner_code: codeFromUrl,
    school_id:    '',
    phone:        '',
  });

  const [schools, setSchools]         = useState<Array<{school_id:string;school_name:string}>>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // If a code was in the URL, look up the learner name to personalise the page
  useEffect(() => {
    if (!codeFromUrl) return;
    setLookingUp(true);
    fetch(`/api/v1/auth/lookup-learner?code=${codeFromUrl}`)
      .then(r => r.json())
      .then(j => {
        if (j.full_name) setLearnerName(j.full_name);
        if (j.already_registered) {
          toast.info('This learner code already has an account. Please sign in instead.');
        }
      })
      .catch(() => {})
      .finally(() => setLookingUp(false));
  }, [codeFromUrl]);

  const loadSchools = async () => {
    if (schools.length) return;
    setLoadingSchools(true);
    const res  = await fetch('/api/v1/schools');
    const json = await res.json();
    setSchools(json.data?.map((s: { school_id: string; school_name: string }) => ({ school_id: s.school_id, school_name: s.school_name })) || []);
    setLoadingSchools(false);
  };

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    if (r === 'instructor') loadSchools();
  };

  const validateStep1 = () => {
    if (!form.full_name.trim()) { toast.error('Enter your full name'); return false; }
    if (!form.email.trim())     { toast.error('Enter your email address'); return false; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // When code is in URL, it's a single-step form — skip step logic
    if (!codeFromUrl && step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }

    // Validate
    if (!validateStep1()) return;
    if (role === 'learner' && !form.learner_code.trim()) {
      toast.error('Enter your learner code'); return;
    }
    if (role === 'instructor' && !form.school_id) {
      toast.error('Select your school'); return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options:  { data: { full_name: form.full_name, role } },
      });
      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error('Registration failed — please try again');

      const userId = authData.user.id;

      const res = await fetch('/api/v1/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:      userId,
          email:        form.email.trim(),
          full_name:    form.full_name.trim(),
          role,
          phone:        form.phone || undefined,
          learner_code: role === 'learner'    ? form.learner_code.trim().toUpperCase() : undefined,
          school_id:    role === 'instructor' ? form.school_id : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        await supabase.auth.signOut();
        throw new Error(json.error || 'Registration failed');
      }

      setDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: DARK_BG, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl p-10" style={GLASS}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(52,211,153,0.15)' }}>
            <UserCheck className="w-8 h-8" style={{ color: '#34D399' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {role === 'instructor' ? 'Application Submitted!' : `Welcome${form.full_name ? `, ${form.full_name.split(' ')[0]}` : ''}! 🎉`}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(240,238,255,0.6)' }}>
            {role === 'instructor'
              ? 'Your teacher account is pending approval. You\'ll be able to sign in once an admin approves it.'
              : 'Your account is ready! Check your email to verify your address, then sign in to access your learner dashboard.'
            }
          </p>
          <Link href="/login" className="btn-primary w-full justify-center">
            Go to Sign In →
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Simplified single-step form when code is in URL ──────────────────────
  if (codeFromUrl) return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: DARK_BG, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: 'rgba(124,58,237,0.2)' }}>
            <GraduationCap className="w-7 h-7" style={{ color: '#A78BFA' }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Girls in STEM</h1>
          {learnerName
            ? <p className="text-sm mt-1" style={{ color: 'rgba(240,238,255,0.7)' }}>
                Welcome, <strong style={{ color: '#C4B5FD' }}>{learnerName}</strong>! Set up your account below.
              </p>
            : <p className="text-sm mt-1" style={{ color: 'rgba(240,238,255,0.5)' }}>
                {lookingUp ? 'Looking up your learner code…' : 'Create your learner account'}
              </p>
          }
        </div>

        <div className="rounded-2xl p-8" style={GLASS}>

          {/* Locked code banner */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <Lock className="w-4 h-4 shrink-0" style={{ color: '#A78BFA' }} />
            <div>
              <p className="text-xs" style={{ color: 'rgba(240,238,255,0.5)' }}>Your learner code</p>
              <p className="text-base font-black font-mono" style={{ color: '#C4B5FD' }}>{codeFromUrl}</p>
            </div>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
              ✓ Verified
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Full Name <span style={{ color: '#F87171' }}>*</span></label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                className="form-input" placeholder="Your full name"
                defaultValue={learnerName} />
            </div>
            <div>
              <label className="form-label">Email Address <span style={{ color: '#F87171' }}>*</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="form-input" placeholder="you@email.com" />
              <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>
                You'll use this to sign in. A parent's email is also fine.
              </p>
            </div>
            <div>
              <label className="form-label">Password <span style={{ color: '#F87171' }}>*</span></label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="form-input pr-10" placeholder="Choose a password (min 8 characters)" />
                <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(240,238,255,0.4)' }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password.length > 0 && form.password.length < 8 && (
                <p className="text-xs mt-1" style={{ color: '#F87171' }}>At least 8 characters required</p>
              )}
            </div>

            <button type="submit" disabled={loading || lookingUp} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
              {loading ? 'Creating your account…' : 'Create My Account'}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(240,238,255,0.4)' }}>
            Already registered?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: '#A78BFA' }}>Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );

  // ── Default two-step form (no code in URL) ───────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: DARK_BG, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: 'rgba(124,58,237,0.2)' }}>
            <GraduationCap className="w-7 h-7" style={{ color: '#A78BFA' }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Girls in STEM</h1>
          <p className="text-sm" style={{ color: 'rgba(240,238,255,0.5)' }}>Create your account</p>
        </div>

        <div className="rounded-2xl p-8" style={GLASS}>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1,2].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={step >= n
                    ? { background: '#7C3AED', color: 'white' }
                    : { background: 'rgba(255,255,255,0.1)', color: 'rgba(240,238,255,0.4)' }}>
                  {n}
                </div>
                <span className="text-xs font-medium"
                  style={{ color: step >= n ? '#C4B5FD' : 'rgba(240,238,255,0.4)' }}>
                  {n === 1 ? 'Account' : 'Profile'}
                </span>
                {n < 2 && <div className="flex-1 h-0.5 rounded"
                  style={{ background: step > n ? '#7C3AED' : 'rgba(255,255,255,0.1)' }} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="form-label">Full Name <span style={{ color: '#F87171' }}>*</span></label>
                  <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                    className="form-input" placeholder="Nomvula Dlamini" />
                </div>
                <div>
                  <label className="form-label">Email Address <span style={{ color: '#F87171' }}>*</span></label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="form-input" placeholder="you@school.edu.za" />
                </div>
                <div>
                  <label className="form-label">Password <span style={{ color: '#F87171' }}>*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => set('password', e.target.value)}
                      className="form-input pr-10" placeholder="Min 8 characters" />
                    <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(240,238,255,0.4)' }}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password.length > 0 && form.password.length < 8 && (
                    <p className="text-xs mt-1" style={{ color: '#F87171' }}>At least 8 characters required</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Phone (optional)</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    className="form-input" placeholder="082 000 0000" />
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-2.5">
                  Continue →
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="form-label mb-2">I am a… <span style={{ color: '#F87171' }}>*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'learner',    label: 'Learner',  icon: GraduationCap, desc: 'I am a student in the programme' },
                      { value: 'instructor', label: 'Teacher',  icon: BookOpen,      desc: 'I teach / facilitate sessions' },
                    ] as const).map(({ value, label, icon: Icon, desc }) => (
                      <button key={value} type="button" onClick={() => handleRoleSelect(value)}
                        className="rounded-xl p-3 text-left transition-all"
                        style={{
                          border: `2px solid ${role === value ? '#7C3AED' : 'rgba(255,255,255,0.12)'}`,
                          background: role === value ? 'rgba(124,58,237,0.15)' : 'transparent',
                        }}>
                        <Icon className="w-5 h-5 mb-1.5"
                          style={{ color: role === value ? '#A78BFA' : 'rgba(240,238,255,0.4)' }} />
                        <p className="text-sm font-semibold"
                          style={{ color: role === value ? '#C4B5FD' : 'rgba(240,238,255,0.8)' }}>
                          {label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(240,238,255,0.4)' }}>{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {role === 'learner' && (
                  <div>
                    <label className="form-label">Learner Code <span style={{ color: '#F87171' }}>*</span></label>
                    <input value={form.learner_code} onChange={e => set('learner_code', e.target.value)}
                      className="form-input font-mono uppercase" placeholder="LRN001" maxLength={10} />
                    <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.4)' }}>
                      Your learner code was given to you by your teacher. It looks like LRN001.
                    </p>
                  </div>
                )}

                {role === 'instructor' && (
                  <div>
                    <label className="form-label">Your School <span style={{ color: '#F87171' }}>*</span></label>
                    <select value={form.school_id} onChange={e => set('school_id', e.target.value)}
                      className="form-select">
                      <option value="">Select school…</option>
                      {loadingSchools
                        ? <option disabled>Loading…</option>
                        : schools.map(s => <option key={s.school_id} value={s.school_id}>{s.school_name}</option>)
                      }
                    </select>
                    <p className="text-xs mt-1" style={{ color: '#FBBF24' }}>
                      Teacher accounts require admin approval before you can sign in.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(240,238,255,0.4)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: '#A78BFA' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Suspense boundary required because useSearchParams needs it in Next.js 14
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0F0820 0%, #1C0B38 50%, #2D1B4E 100%)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7C3AED' }} />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
