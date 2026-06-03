'use client'
import { useState } from 'react'
import { submitApplication } from '@/lib/data'
import { Card, Btn } from '@/components/ui'

type Step = 1 | 2 | 3

interface FormData {
  first_name: string
  surname: string
  dob: string
  contact_phone: string
  email: string
  school_name: string
  grade: string
  ap_math_pct: string
  ap_science_pct: string
  ap_english_pct: string
  motivation_text: string
  community_problem: string
}

const EMPTY: FormData = {
  first_name: '', surname: '', dob: '', contact_phone: '', email: '',
  school_name: '', grade: '9',
  ap_math_pct: '', ap_science_pct: '', ap_english_pct: '',
  motivation_text: '', community_problem: '',
}

export function ApplicationForm() {
  const [step, setStep]       = useState<Step>(1)
  const [form, setForm]       = useState<FormData>(EMPTY)
  const [submitting, setSub]  = useState(false)
  const [result, setResult]   = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const progress = ((step - 1) / 2) * 100 + 33

  async function handleSubmit() {
    setSub(true)
    const res = await submitApplication({
      first_name:        form.first_name.trim(),
      surname:           form.surname.trim(),
      dob:               form.dob || undefined,
      contact_phone:     form.contact_phone.trim(),
      email:             form.email.trim() || undefined,
      school_name:       form.school_name.trim(),
      grade:             parseInt(form.grade),
      ap_math_pct:       form.ap_math_pct ? parseFloat(form.ap_math_pct) : undefined,
      ap_science_pct:    form.ap_science_pct ? parseFloat(form.ap_science_pct) : undefined,
      ap_english_pct:    form.ap_english_pct ? parseFloat(form.ap_english_pct) : undefined,
      motivation_text:   form.motivation_text.trim() || undefined,
      community_problem: form.community_problem.trim() || undefined,
    })
    setSub(false)
    setResult(res)
  }

  // ── Success screen ────────────────────────────────────────────
  if (result?.success) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div
          className="rounded-2xl p-10"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <div className="serif font-medium text-2xl mb-2" style={{ color: 'var(--green)' }}>
            Application Submitted!
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
            {result.message ?? 'We have received your application and will be in touch within 5 working days.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Btn onClick={() => { setForm(EMPTY); setResult(null); setStep(1) }} variant="ghost">
              Submit another
            </Btn>
            <Btn onClick={() => window.location.href = '/candidates'}>
              View candidates →
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  const inputCls = `w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all`
  const inputStyle: React.CSSProperties = {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'Figtree, sans-serif',
  }

  function Field({
    label, field, type = 'text', placeholder, required, children,
  }: {
    label: string
    field: keyof FormData
    type?: string
    placeholder?: string
    required?: boolean
    children?: React.ReactNode
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
          {label}
          {required && <span style={{ color: 'var(--red)' }}> *</span>}
        </label>
        {children ?? (
          <input
            type={type}
            value={form[field]}
            onChange={e => set(field, e.target.value)}
            placeholder={placeholder}
            required={required}
            className={inputCls}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,110,245,0.5)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        )}
      </div>
    )
  }

  const steps = [
    { n: 1, label: 'Personal Info' },
    { n: 2, label: 'Academic' },
    { n: 3, label: 'Motivation' },
  ]

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => step > s.n && setStep(s.n as Step)}
                className="flex items-center gap-2 shrink-0"
                style={{ cursor: step > s.n ? 'pointer' : 'default' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mono transition-all"
                  style={{
                    background: step === s.n
                      ? 'linear-gradient(135deg,#7c6ef5,#c084fc)'
                      : step > s.n
                        ? 'var(--green-bg)'
                        : 'var(--bg3)',
                    color: step === s.n
                      ? '#fff'
                      : step > s.n
                        ? 'var(--green)'
                        : 'var(--text3)',
                    border: step > s.n ? '1px solid rgba(52,211,153,0.3)' : '1px solid var(--border)',
                  }}
                >
                  {step > s.n ? '✓' : s.n}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: step === s.n ? 'var(--text)' : 'var(--text3)' }}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className="flex-1 mx-3"
                  style={{ height: 1, background: step > s.n ? 'var(--green)' : 'var(--border)' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Personal */}
        {step === 1 && (
          <Card>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>Personal Information</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Basic contact details for the applicant</div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <Field label="First Name" field="first_name" placeholder="e.g. Habza" required />
              <Field label="Surname" field="surname" placeholder="e.g. Ali" required />
              <Field label="Date of Birth" field="dob" type="date" />
              <Field label="Contact Phone" field="contact_phone" placeholder="e.g. 082 000 0000" required />
              <div className="col-span-2">
                <Field label="Email Address" field="email" type="email" placeholder="optional" />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end">
              <Btn
                onClick={() => {
                  if (!form.first_name || !form.surname || !form.contact_phone) {
                    alert('Please fill in First Name, Surname and Contact Phone')
                    return
                  }
                  setStep(2)
                }}
              >
                Next: Academic Info →
              </Btn>
            </div>
          </Card>
        )}

        {/* Step 2 — Academic */}
        {step === 2 && (
          <Card>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>Academic Background</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>School and latest report marks</div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="School Name" field="school_name" placeholder="e.g. UJ Academy" required />
              </div>
              <Field label="Grade" field="grade">
                <select
                  value={form.grade}
                  onChange={e => set('grade', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  {[8, 9, 10, 11, 12].map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </Field>

              <div /> {/* spacer */}

              {/* Report marks */}
              <div
                className="col-span-2 rounded-xl p-4 grid grid-cols-3 gap-4"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <div className="col-span-3 text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                  Latest School Report — Percentages
                </div>
                {[
                  { label: 'Mathematics %', field: 'ap_math_pct' as const },
                  { label: 'Science %',     field: 'ap_science_pct' as const },
                  { label: 'English %',     field: 'ap_english_pct' as const },
                ].map(f => (
                  <div key={f.field} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
                      {f.label}
                    </label>
                    <input
                      type="number"
                      min={0} max={100}
                      value={form[f.field]}
                      onChange={e => set(f.field, e.target.value)}
                      placeholder="0–100"
                      className={`${inputCls} mono`}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-between">
              <Btn variant="ghost" onClick={() => setStep(1)}>← Back</Btn>
              <Btn onClick={() => {
                if (!form.school_name) { alert('Please enter the school name'); return }
                setStep(3)
              }}>
                Next: Motivation →
              </Btn>
            </div>
          </Card>
        )}

        {/* Step 3 — Motivation */}
        {step === 3 && (
          <Card>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>Motivation & Vision</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Help us understand why this candidate wants to join Girls in STEM</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
                  Why do you want to join Girls in STEM? <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                  rows={5}
                  value={form.motivation_text}
                  onChange={e => set('motivation_text', e.target.value)}
                  placeholder="Tell us what excites you about science and technology, and what you hope to achieve through this programme…"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ ...inputStyle }}
                />
                <div className="text-xs text-right" style={{ color: 'var(--text3)' }}>
                  {form.motivation_text.length} characters
                  {form.motivation_text.length > 0 && form.motivation_text.split(/\s+/).length < 50 && (
                    <span style={{ color: 'var(--amber)' }}>
                      {' '}— aim for at least 50 words ({form.motivation_text.split(/\s+/).length} so far)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
                  What problem in your community would you solve with STEM?
                </label>
                <textarea
                  rows={4}
                  value={form.community_problem}
                  onChange={e => set('community_problem', e.target.value)}
                  placeholder="Describe a challenge in your school or community, and how you think STEM skills could help address it…"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ ...inputStyle }}
                />
              </div>

              {/* Summary card */}
              <div
                className="rounded-xl p-4 text-xs space-y-1"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
              >
                <div className="font-semibold mb-2" style={{ color: 'var(--text3)' }}>Application Summary</div>
                <div>Name: <span style={{ color: 'var(--text)' }}>{form.first_name} {form.surname}</span></div>
                <div>School: <span style={{ color: 'var(--text)' }}>{form.school_name} — Grade {form.grade}</span></div>
                <div>Phone: <span style={{ color: 'var(--text)' }}>{form.contact_phone}</span></div>
                {(form.ap_math_pct || form.ap_science_pct) && (
                  <div>
                    Report: <span style={{ color: 'var(--text)' }}>
                      Math {form.ap_math_pct}% · Sci {form.ap_science_pct}% · Eng {form.ap_english_pct}%
                    </span>
                  </div>
                )}
              </div>

              {result?.error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  ✕ {result.error}
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-between">
              <Btn variant="ghost" onClick={() => setStep(2)}>← Back</Btn>
              <Btn
                onClick={handleSubmit}
                disabled={submitting || !form.motivation_text}
              >
                {submitting ? 'Submitting…' : 'Submit Application →'}
              </Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
