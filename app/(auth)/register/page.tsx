'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, GraduationCap, BookOpen, UserCheck, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils';

type Role = 'learner' | 'instructor';

export default function RegisterPage() {
  const [role,        setRole]        = useState<Role>('learner');
  const [step,        setStep]        = useState<1|2>(1);
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [done,        setDone]        = useState(false);

  const [form, setForm] = useState({
    full_name:    '',
    email:        '',
    password:     '',
    learner_code: '',   // learners only
    school_id:    '',   // teachers only
    phone:        '',
  });

  const [schools, setSchools]   = useState<Array<{school_id:string;school_name:string}>>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const loadSchools = async () => {
    if (schools.length) return;
    setLoadingSchools(true);
    const res  = await fetch('/api/v1/schools');
    const json = await res.json();
    setSchools(json.data?.map((s: any) => ({ school_id: s.school_id, school_name: s.school_name })) || []);
    setLoadingSchools(false);
  };

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    if (r === 'instructor') loadSchools();
  };

  const validateStep1 = () => {
    if (!form.full_name.trim()) { toast.error('Enter your full name'); return false; }
    if (!form.email.trim())     { toast.error('Enter your email');      return false; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { if (validateStep1()) setStep(2); return; }

    if (role === 'learner' && !form.learner_code.trim()) {
      toast.error('Enter your learner code — ask your teacher if you don\'t know it'); return;
    }
    if (role === 'instructor' && !form.school_id) {
      toast.error('Select your school'); return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options:  { data: { full_name: form.full_name, role } },
      });
      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error('Registration failed — please try again');

      const userId = authData.user.id;

      // 2. Register via API
      const res = await fetch('/api/v1/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:      userId,
          email:        form.email.trim(),
          full_name:    form.full_name.trim(),
          role,
          phone:        form.phone || undefined,
          learner_code: role === 'learner'     ? form.learner_code.trim().toUpperCase() : undefined,
          school_id:    role === 'instructor'  ? form.school_id : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Clean up auth user if profile creation failed
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

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          <div className="w-16 h-16 rounded-full bg-mint-400/20 flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-mint-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {role === 'instructor' ? 'Application Submitted!' : 'Welcome Aboard! 🎉'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {role === 'instructor'
              ? 'Your teacher account is pending approval by an administrator. You\'ll receive an email once approved.'
              : 'Your account is ready. Please check your email to verify your address, then sign in.'
            }
          </p>
          <Link href="/login" className="btn-primary w-full justify-center">
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-400/20 mb-3">
            <GraduationCap className="w-7 h-7 text-mint-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Girls in STEM</h1>
          <p className="text-brand-200 text-sm">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1,2].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step >= n ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-400'
                )}>{n}</div>
                <span className={cn('text-xs font-medium', step >= n ? 'text-brand-700' : 'text-gray-400')}>
                  {n === 1 ? 'Account' : 'Profile'}
                </span>
                {n < 2 && <div className={cn('flex-1 h-0.5 rounded', step > n ? 'bg-brand-700' : 'bg-gray-200')} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {step === 1 ? (
              <>
                <div>
                  <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                  <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                    className="form-input" placeholder="Nomvula Dlamini" />
                </div>
                <div>
                  <label className="form-label">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="form-input" placeholder="you@school.edu.za" />
                </div>
                <div>
                  <label className="form-label">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => set('password', e.target.value)}
                      className="form-input pr-10" placeholder="Min 8 characters" />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password.length > 0 && form.password.length < 8 && (
                    <p className="text-xs text-red-500 mt-1">At least 8 characters required</p>
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
                {/* Role selection */}
                <div>
                  <label className="form-label mb-2">I am a… <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'learner',    label: 'Learner',    icon: GraduationCap, desc: 'I am a student in the programme' },
                      { value: 'instructor', label: 'Teacher',    icon: BookOpen,      desc: 'I teach / facilitate sessions' },
                    ] as const).map(({ value, label, icon: Icon, desc }) => (
                      <button key={value} type="button" onClick={() => handleRoleSelect(value)}
                        className={cn(
                          'border-2 rounded-xl p-3 text-left transition-all',
                          role === value
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-gray-200 hover:border-brand-300'
                        )}>
                        <Icon className={cn('w-5 h-5 mb-1.5', role === value ? 'text-brand-700' : 'text-gray-400')} />
                        <p className={cn('text-sm font-semibold', role === value ? 'text-brand-800' : 'text-gray-700')}>
                          {label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Learner fields */}
                {role === 'learner' && (
                  <div>
                    <label className="form-label">Learner Code <span className="text-red-500">*</span></label>
                    <input value={form.learner_code} onChange={e => set('learner_code', e.target.value)}
                      className="form-input font-mono uppercase" placeholder="LRN001"
                      maxLength={10} />
                    <p className="text-xs text-gray-400 mt-1">
                      Your learner code was given to you by your instructor. It looks like LRN001.
                    </p>
                  </div>
                )}

                {/* Teacher fields */}
                {role === 'instructor' && (
                  <div>
                    <label className="form-label">Your School <span className="text-red-500">*</span></label>
                    <select value={form.school_id} onChange={e => set('school_id', e.target.value)}
                      className="form-select">
                      <option value="">Select school…</option>
                      {loadingSchools
                        ? <option disabled>Loading…</option>
                        : schools.map(s => (
                            <option key={s.school_id} value={s.school_id}>{s.school_name}</option>
                          ))
                      }
                    </select>
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠ Teacher accounts require admin approval before you can sign in.
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

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
