'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  INTERESTS, NEXT_STEPS, CONTEXT_QUESTIONS, PILLAR_DEFAULT_INTEREST,
  deriveCategory, needsOrganisation, leadSchema,
  type InterestId, type NextStepId, type Pillar,
} from '@/lib/connect';
import { BRAND } from './brand';
import Flywheel from './Flywheel';

const COUNTRIES = [
  'Netherlands', 'South Africa', 'United Kingdom', 'Germany', 'Belgium', 'France', 'Ireland',
  'Poland', 'Portugal', 'Spain', 'Italy', 'Switzerland', 'Sweden', 'Denmark', 'Norway', 'Finland',
  'United States', 'Canada', 'India', 'Philippines', 'United Arab Emirates', 'Kenya', 'Nigeria',
  'Egypt', 'Morocco', 'Mauritius', 'Australia', 'Singapore',
];

const ENGAGE: Array<{
  pillar: Pillar; num: string; title: string; unit: string; color: string;
  body: string; points: string[]; cta: string;
}> = [
  {
    pillar: 'MCX', num: '01', title: 'Bring us one process', unit: 'Melisizwe Customer Experience (MCX)',
    color: BRAND.green,
    body: 'For businesses exploring BPO, customer experience, digital adoption and AI-enabled business support.',
    points: [
      'Customer care, digital & technical support and back-office customer operations',
      'Delivered by Melisizwe-trained teams, directly and with delivery partners',
      'Start small: one process, one pilot, measurable results',
    ],
    cta: 'Explore Business Opportunities',
  },
  {
    pillar: 'Academy', num: '02', title: 'Build the talent engine', unit: 'The Melisizwe Academy',
    color: BRAND.blue,
    body: 'For training, workforce readiness, talent pipeline and skills development collaborations.',
    points: [
      'Workplace-relevant digital, technical and customer-service skills',
      'Work-readiness programmes shaped around your roles',
      'A pipeline of job-ready talent for your operations',
    ],
    cta: 'Explore Talent Partnerships',
  },
  {
    pillar: 'NPO', num: '03', title: 'Invest in potential', unit: 'Melisizwe NPO',
    color: BRAND.red,
    body: 'For Girls in STEM Africa, STEM education, digital inclusion, sponsorship, mentorship, volunteering and strategic support.',
    points: [
      'Sponsor learners and digital access',
      'Mentor or volunteer with our programmes',
      'Strategic support that strengthens the talent pipeline',
    ],
    cta: 'Explore Social Impact Partnerships',
  },
];

type FormState = {
  full_name: string; email: string; country: string; organisation: string; job_title: string;
  interests: InterestId[]; context_answer: string; message: string;
  next_step: NextStepId | ''; marketing_opt_in: boolean; privacy_ack: boolean; website: string;
};

const EMPTY: FormState = {
  full_name: '', email: '', country: '', organisation: '', job_title: '',
  interests: [], context_answer: '', message: '',
  next_step: '', marketing_opt_in: false, privacy_ack: false, website: '',
};

export default function ConnectPage() {
  const router = useRouter();
  const formRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const category = form.interests.length ? deriveCategory(form.interests) : null;
  const orgRequired = needsOrganisation(form.interests);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function toggleInterest(id: InterestId) {
    set('interests', form.interests.includes(id)
      ? form.interests.filter(i => i !== id)
      : [...form.interests, id]);
  }

  // Each engagement card opens the one shared form with its category ticked
  function openForm(pillar: Pillar) {
    const id = PILLAR_DEFAULT_INTEREST[pillar];
    setForm(f => f.interests.includes(id) ? f : { ...f, interests: [...f.interests, id] });
    setErrors(e => { const n = { ...e }; delete n.interests; return n; });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 500);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        next[key] ??= issue.message;
      }
      // zod skips the organisation refinement while other fields fail — show it up front
      if (orgRequired && form.organisation.trim().length < 2) {
        next.organisation ??= 'Organisation is required for business enquiries';
      }
      setErrors(next);
      const first = document.querySelector<HTMLElement>(`[data-field="${Object.keys(next)[0]}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong. Please try again.');
      router.push('/connect/thank-you');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: BRAND.paper, color: BRAND.ink, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ background: 'rgba(255,255,255,0.92)', borderColor: BRAND.line }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <a href="#top" className="flex items-center gap-2" aria-label="Melisizwe — back to top">
            <Image src="/connect/melisizwe-logo.png" alt="Melisizwe" width={46} height={44} priority />
          </a>
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-4">
            <a href="#flywheel" className="hidden px-2 py-1 sm:inline" style={{ color: BRAND.inkMid }}>Flywheel</a>
            <a href="#engage" className="hidden px-2 py-1 sm:inline" style={{ color: BRAND.inkMid }}>Engage</a>
            <a href="#connect" className="rounded-full px-4 py-2 text-white" style={{ background: BRAND.red }}>Let&rsquo;s connect</a>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-8 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pb-16 md:pt-14">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: BRAND.inkMuted }}>
              Shared Services &amp; Outsourcing Week · Amsterdam 2026
            </p>
            <h1 className="text-[2.35rem] font-bold leading-[1.05] sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              From Untapped Talent to{' '}
              <span style={{ color: BRAND.red }}>Global Digital Delivery.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: BRAND.inkMid }}>
              Melisizwe is a South African social enterprise building an end-to-end talent and service
              delivery ecosystem for the digital economy.
            </p>
            <div className="mt-5 flex gap-2" aria-hidden>
              {[BRAND.red, BRAND.blue, BRAND.yellow, BRAND.green, BRAND.cyan].map(c => (
                <span key={c} className="h-1.5 w-10 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#engage" className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ background: BRAND.red }}>
                Explore ways to engage
              </a>
              <a href="#flywheel" className="rounded-full border px-6 py-3 text-sm font-bold" style={{ borderColor: BRAND.ink, color: BRAND.ink }}>
                See the flywheel
              </a>
            </div>
          </div>
          <div className="relative">
            <Image
              src="/connect/hero-photo.jpg" alt="Two young women from the Melisizwe Girls in STEM programme"
              width={647} height={552} priority className="h-auto w-full"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </section>

        {/* ── Flywheel ──────────────────────────────────────────────────────── */}
        <section id="flywheel" className="scroll-mt-16 py-12 md:py-20" style={{ background: BRAND.mist }}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              The Melisizwe Flywheel
            </h2>
            <p className="mt-2 text-center text-base" style={{ color: BRAND.inkMid }}>
              From potential to opportunity. One connected ecosystem.
            </p>
            <Flywheel />
          </div>
        </section>

        {/* ── Engagement options ────────────────────────────────────────────── */}
        <section id="engage" className="scroll-mt-16 py-12 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Three ways to engage
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center" style={{ color: BRAND.inkMid }}>
              Business · Talent · Impact. Choose where to start. You can select more than one in the form.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {ENGAGE.map(card => (
                <article key={card.pillar} className="flex flex-col overflow-hidden rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
                  <div className="h-1.5" style={{ background: card.color }} />
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-sm font-bold" style={{ color: card.color }}>{card.num} · {card.unit}</p>
                    <h3 className="mt-2 text-2xl font-bold uppercase leading-tight tracking-tight">{card.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed" style={{ color: BRAND.inkMid }}>{card.body}</p>
                    <ul className="mt-4 space-y-2 text-sm" style={{ color: BRAND.inkMid }}>
                      {card.points.map(p => (
                        <li key={p} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: card.color }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button" onClick={() => openForm(card.pillar)}
                      className="mt-6 w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 md:mt-auto"
                      style={{ background: card.color }}
                    >
                      {card.cta} →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Lead form ─────────────────────────────────────────────────────── */}
        <section id="connect" ref={formRef} className="scroll-mt-14 py-12 md:py-20" style={{ background: BRAND.mist }}>
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Let&rsquo;s connect
            </h2>
            <p className="mt-2" style={{ color: BRAND.inkMid }}>Takes about a minute. Fields marked * are required.</p>

            <form onSubmit={submit} noValidate className="mt-8 space-y-8 rounded-2xl border bg-white p-5 sm:p-8" style={{ borderColor: BRAND.line }}>
              {/* Honeypot */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e => set('website', e.target.value)} /></label>
              </div>

              <Fieldset legend="Your details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" required error={errors.full_name} name="full_name">
                    <input ref={nameRef} id="full_name" autoComplete="name" value={form.full_name}
                      onChange={e => set('full_name', e.target.value)} className={inputCls(errors.full_name)} />
                  </Field>
                  <Field label="Work email" required error={errors.email} name="email">
                    <input id="email" type="email" inputMode="email" autoComplete="email" value={form.email}
                      onChange={e => set('email', e.target.value)} className={inputCls(errors.email)} />
                  </Field>
                  <Field label="Organisation / company" required={orgRequired} error={errors.organisation} name="organisation"
                    hint={orgRequired ? undefined : 'Required for business enquiries'}>
                    <input id="organisation" autoComplete="organization" value={form.organisation}
                      onChange={e => set('organisation', e.target.value)} className={inputCls(errors.organisation)} />
                  </Field>
                  <Field label="Job title" error={errors.job_title} name="job_title" hint="Optional">
                    <input id="job_title" autoComplete="organization-title" value={form.job_title}
                      onChange={e => set('job_title', e.target.value)} className={inputCls(errors.job_title)} />
                  </Field>
                  <Field label="Country" required error={errors.country} name="country">
                    <input id="country" list="country-list" autoComplete="country-name" value={form.country}
                      onChange={e => set('country', e.target.value)} className={inputCls(errors.country)} />
                    <datalist id="country-list">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
                  </Field>
                </div>
              </Fieldset>

              <Fieldset legend="How would you like to engage? *" hint="Select all that apply." error={errors.interests} name="interests">
                <div className="grid gap-2 sm:grid-cols-2">
                  {INTERESTS.map(opt => {
                    const checked = form.interests.includes(opt.id);
                    const color = opt.pillar === 'MCX' ? BRAND.green : opt.pillar === 'Academy' ? BRAND.blue : opt.pillar === 'NPO' ? BRAND.red : BRAND.ink;
                    return (
                      <label key={opt.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors"
                        style={{ borderColor: checked ? color : BRAND.line, background: checked ? `${color}0F` : '#fff' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleInterest(opt.id)}
                          className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: color }} />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </Fieldset>

              <Fieldset legend="Tell us more">
                <Field label={category ? CONTEXT_QUESTIONS[category] : 'Choose how you would like to engage above, then tell us a little more.'}
                  error={errors.context_answer} name="context_answer" hint="Optional · a sentence or two is perfect">
                  <textarea id="context_answer" rows={3} value={form.context_answer} disabled={!category}
                    onChange={e => set('context_answer', e.target.value)} className={inputCls(errors.context_answer)} />
                </Field>
                <Field label="Anything else? (optional)" error={errors.message} name="message">
                  <textarea id="message" rows={2} value={form.message}
                    onChange={e => set('message', e.target.value)} className={inputCls(errors.message)} />
                </Field>
              </Fieldset>

              <Fieldset legend="What would you like us to do next? *" error={errors.next_step} name="next_step">
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {NEXT_STEPS.map(s => {
                    const checked = form.next_step === s.id;
                    return (
                      <label key={s.id}
                        className="cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                        style={{ borderColor: checked ? BRAND.ink : BRAND.line, background: checked ? BRAND.ink : '#fff', color: checked ? '#fff' : BRAND.ink }}>
                        <input type="radio" name="next_step" value={s.id} checked={checked}
                          onChange={() => set('next_step', s.id)} className="sr-only" />
                        {s.label}
                      </label>
                    );
                  })}
                </div>
              </Fieldset>

              {/* Privacy & consent */}
              <div className="space-y-3 border-t pt-6" style={{ borderColor: BRAND.line }}>
                <details className="rounded-xl px-4 py-3 text-sm" style={{ background: BRAND.mist }}>
                  <summary className="cursor-pointer font-semibold">Privacy notice: how we use your details</summary>
                  <div className="mt-2 space-y-2 leading-relaxed" style={{ color: BRAND.inkMid }}>
                    <p>Melisizwe uses the details you submit only to respond to your enquiry and follow up on the
                      engagement you selected. We record that you connected with us at Shared Services &amp; Outsourcing
                      Week, Amsterdam 2026.</p>
                    <p>Your details are stored securely and are only accessible to authorised Melisizwe staff. We do not sell
                      or share them with third parties for marketing, and keep them only as long as needed for this enquiry and
                      any relationship that follows from it.</p>
                    <p>You can ask to see, correct or delete your information at any time (POPIA and GDPR) by contacting us via{' '}
                      <a href="https://www.melisizwe.co.za" className="underline" target="_blank" rel="noopener noreferrer">melisizwe.co.za</a>.
                      See also our <a href="/privacy" className="underline" target="_blank">privacy policy</a>.</p>
                  </div>
                </details>
                <label data-field="privacy_ack" className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={form.privacy_ack} onChange={e => set('privacy_ack', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: BRAND.red }} aria-invalid={!!errors.privacy_ack} />
                  <span>I have read the privacy notice and agree that Melisizwe may contact me about this enquiry. *</span>
                </label>
                {errors.privacy_ack && <p className="text-sm font-medium" style={{ color: BRAND.red }} role="alert">{errors.privacy_ack}</p>}
                <label className="flex items-start gap-3 text-sm" style={{ color: BRAND.inkMid }}>
                  <input type="checkbox" checked={form.marketing_opt_in} onChange={e => set('marketing_opt_in', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: BRAND.red }} />
                  <span>Optional: send me occasional Melisizwe news and impact updates. You can unsubscribe at any time.</span>
                </label>
              </div>

              {serverError && (
                <p className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#FDECEE', color: BRAND.redDeep }} role="alert">
                  {serverError}
                </p>
              )}

              <button type="submit" disabled={submitting}
                className="w-full rounded-xl py-4 text-base font-extrabold uppercase tracking-[0.12em] text-white transition-opacity disabled:opacity-60"
                style={{ background: BRAND.red }}>
                {submitting ? 'Sending…' : 'Let’s Connect'}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t py-8" style={{ borderColor: BRAND.line }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-sm sm:px-6" style={{ color: BRAND.inkMuted }}>
          <Image src="/connect/melisizwe-logo.png" alt="Melisizwe" width={58} height={55} />
          <p className="font-semibold" style={{ color: BRAND.ink }}>From untapped talent to global digital delivery.</p>
          <p>
            <a href="https://www.melisizwe.co.za" className="underline" target="_blank" rel="noopener noreferrer">www.melisizwe.co.za</a>
            {' · '}<a href="/privacy" className="underline">Privacy</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────

function inputCls(error?: string) {
  return [
    'w-full rounded-xl border bg-white px-3.5 py-3 text-[16px] text-[#111] outline-none transition-shadow',
    'focus:ring-2 focus:ring-[#0B5E86]/30 disabled:bg-[#F5F6F8] disabled:text-[#9CA3AF]',
    error ? 'border-[#C8102E]' : 'border-[#D1D5DB]',
  ].join(' ');
}

function Fieldset({ legend, hint, error, name, children }: {
  legend: string; hint?: string; error?: string; name?: string; children: React.ReactNode;
}) {
  return (
    <fieldset data-field={name} className="space-y-3">
      <legend className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: BRAND.inkMuted }}>{legend}</legend>
      {hint && <p className="-mt-1 text-sm" style={{ color: BRAND.inkMuted }}>{hint}</p>}
      {children}
      {error && <p className="text-sm font-medium" style={{ color: BRAND.red }} role="alert">{error}</p>}
    </fieldset>
  );
}

function Field({ label, required, hint, error, name, children }: {
  label: string; required?: boolean; hint?: string; error?: string; name: string; children: React.ReactNode;
}) {
  return (
    <div data-field={name} className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-semibold">
        {label}{required && <span style={{ color: BRAND.red }}> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs" style={{ color: BRAND.inkMuted }}>{hint}</p>}
      {error && <p className="text-sm font-medium" style={{ color: BRAND.red }} role="alert">{error}</p>}
    </div>
  );
}
