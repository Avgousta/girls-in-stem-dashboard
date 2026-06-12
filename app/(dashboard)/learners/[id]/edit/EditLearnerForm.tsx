'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, CheckSquare, Square, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils';

interface Props {
  learner:  any;
  schools:  Array<{ school_id: string; school_name: string }>;
  programs: Array<{ program_id: string; program_name: string; program_type: string }>;
}

export default function EditLearnerForm({ learner, schools, programs }: Props) {
  const router = useRouter();
  const profile = learner.learner_profiles || {};

  const [saving,   setSaving]   = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const [form, setForm] = useState({
    first_name:        profile.first_name        || '',
    last_name:         profile.last_name         || '',
    email:             profile.email             || '',
    phone:             profile.phone             || '',
    parent_name:       profile.parent_name       || '',
    parent_contact:    profile.parent_contact    || '',
    grade:             String(learner.grade      || 10),
    school_id:         learner.school_id         || '',
    programme_status:  learner.programme_status  || 'active',
    // context fields
    primary_language:  profile.primary_language  || '',
    transport_type:    profile.transport_type    || '',
    household_size:    profile.household_size != null ? String(profile.household_size) : '',
    internet_access:   profile.internet_access  != null ? String(profile.internet_access)  : '',
    first_gen_student: profile.first_gen_student != null ? String(profile.first_gen_student) : '',
    // WhatsApp
    whatsapp_number:   profile.whatsapp_number   || '',
    whatsapp_opted_in: profile.whatsapp_opted_in != null ? String(profile.whatsapp_opted_in) : 'false',
  });

  // Current enrolments
  type EnrolEntry = { status: string; program_id: string };
  const currentEnrolments: string[] = ((learner.program_enrollments || []) as unknown as EnrolEntry[])
    .filter(e => e.status === 'active')
    .map(e => e.program_id);

  const [selectedPrograms, setSelected] = useState<string[]>(currentEnrolments);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const toggleProgram = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); return; }
    if (!form.last_name.trim())  { toast.error('Last name is required');  return; }
    if (selectedPrograms.length === 0) { toast.error('Select at least one programme'); return; }

    setSaving(true);
    try {
      // 1. Update learner details
      const res = await fetch(`/api/v1/learners/${learner.learner_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:        form.first_name,
          last_name:         form.last_name,
          email:             form.email           || undefined,
          phone:             form.phone           || undefined,
          parent_name:       form.parent_name     || undefined,
          parent_contact:    form.parent_contact  || undefined,
          grade:             Number(form.grade),
          school_id:         form.school_id       || undefined,
          programme_status:  form.programme_status,
          primary_language:  form.primary_language  || undefined,
          transport_type:    form.transport_type    || undefined,
          household_size:    form.household_size    ? Number(form.household_size) : undefined,
          internet_access:   form.internet_access   !== '' ? form.internet_access   === 'true' : undefined,
          first_gen_student: form.first_gen_student !== '' ? form.first_gen_student === 'true' : undefined,
          whatsapp_number:   form.whatsapp_number   || undefined,
          whatsapp_opted_in: form.whatsapp_opted_in === 'true',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update learner');

      // 2. Sync programme enrolments
      // Remove programmes that were deselected
      const toRemove = currentEnrolments.filter(id => !selectedPrograms.includes(id));
      // Add programmes that were newly selected
      const toAdd    = selectedPrograms.filter(id => !currentEnrolments.includes(id));

      await Promise.all([
        ...toRemove.map(pid =>
          fetch('/api/v1/enrollments', {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ learner_id: learner.learner_id, program_id: pid }),
          })
        ),
        ...toAdd.map(pid =>
          fetch('/api/v1/enrollments', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ learner_id: learner.learner_id, program_id: pid }),
          })
        ),
      ]);

      toast.success('Learner updated successfully');
      // If marking as graduated, redirect to alumni page to create record
      if (form.programme_status === 'graduated' && learner.programme_status !== 'graduated') {
        router.push('/alumni');
      } else {
        router.push(`/learners/${learner.learner_id}`);
      }
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirmWithdraw) { setConfirmWithdraw(true); return; }
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/v1/learners/${learner.learner_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programme_status: 'withdrawn' }),
      });
      if (!res.ok) throw new Error('Failed to withdraw learner');
      toast.success('Learner marked as withdrawn');
      router.push('/learners');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setWithdrawing(false);
      setConfirmWithdraw(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Personal info */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">First Name <span className="text-red-500">*</span></label>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
              className="form-input" placeholder="Nomvula" />
          </div>
          <div>
            <label className="form-label">Last Name <span className="text-red-500">*</span></label>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
              className="form-input" placeholder="Dlamini" />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="form-input" placeholder="learner@school.edu.za" />
          </div>
          <div>
            <label className="form-label">Phone Number</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              className="form-input" placeholder="082 000 0000" />
          </div>
        </div>
      </div>

      {/* Academic details */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
          Academic Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">School</label>
            <select value={form.school_id} onChange={e => set('school_id', e.target.value)} className="form-select">
              <option value="">Select school…</option>
              {schools.map(s => (
                <option key={s.school_id} value={s.school_id}>{s.school_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Grade</label>
            <select value={form.grade} onChange={e => set('grade', e.target.value)} className="form-select">
              {[8,9,10,11,12].map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={form.programme_status} onChange={e => set('programme_status', e.target.value)} className="form-select">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Programme enrolments */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1 pb-2 border-b border-gray-100">
          Programmes <span className="text-red-500">*</span>
        </h2>
        <p className="text-xs text-gray-400 mb-3">Tick the programmes this learner is enrolled in.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {programs.map(p => {
            const checked = selectedPrograms.includes(p.program_id);
            return (
              <button key={p.program_id} type="button" onClick={() => toggleProgram(p.program_id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
                  checked ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                )}>
                <span className={cn('shrink-0', checked ? 'text-brand-700' : 'text-gray-300')}>
                  {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium truncate', checked ? 'text-brand-800' : 'text-gray-700')}>
                    {p.program_name}
                  </p>
                  <p className="text-xs text-gray-400">{p.program_type}</p>
                </div>
              </button>
            );
          })}
        </div>
        {selectedPrograms.length > 0 && (
          <p className="mt-2 text-xs text-brand-700 font-medium">
            ✓ {selectedPrograms.length} programme{selectedPrograms.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Parent / Guardian */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
          Parent / Guardian
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Name</label>
            <input value={form.parent_name} onChange={e => set('parent_name', e.target.value)}
              className="form-input" placeholder="Thandi Dlamini" />
          </div>
          <div>
            <label className="form-label">Contact Number</label>
            <input type="tel" value={form.parent_contact} onChange={e => set('parent_contact', e.target.value)}
              className="form-input" placeholder="083 000 0000" />
          </div>
        </div>
      </div>

      {/* Context & Background */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
          Context &amp; Background
        </h2>
        <p className="text-xs text-gray-400 mb-3">Optional. Used for risk segmentation and sponsor reporting.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Primary Language</label>
            <input value={form.primary_language} onChange={e => set('primary_language', e.target.value)}
              className="form-input" placeholder="isiZulu, Sesotho, English…" />
          </div>
          <div>
            <label className="form-label">Transport to School</label>
            <select value={form.transport_type} onChange={e => set('transport_type', e.target.value)} className="form-select">
              <option value="">Not specified</option>
              <option value="walk">Walk</option>
              <option value="taxi">Taxi / Minibus</option>
              <option value="bus">Bus</option>
              <option value="car">Private car</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="form-label">Household Size</label>
            <input type="number" min={1} max={20} value={form.household_size}
              onChange={e => set('household_size', e.target.value)}
              className="form-input" placeholder="e.g. 5" />
          </div>
          <div>
            <label className="form-label">Home Internet Access</label>
            <select value={form.internet_access} onChange={e => set('internet_access', e.target.value)} className="form-select">
              <option value="">Not specified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="form-label">First-Generation Student</label>
            <select value={form.first_gen_student} onChange={e => set('first_gen_student', e.target.value)} className="form-select">
              <option value="">Not specified</option>
              <option value="true">Yes — first in family at higher ed</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">📲 WhatsApp Notifications</p>
          <p className="text-xs text-gray-400 mb-3">
            WhatsApp alerts (absence, re-engagement, monthly summaries) are sent only when a number is provided
            and the parent/guardian has explicitly opted in.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">WhatsApp Number</label>
              <input type="tel" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)}
                className="form-input" placeholder="+27821234567" />
              <p className="text-[10px] text-gray-400 mt-1">E.164 format — include country code, e.g. +27</p>
            </div>
            <div>
              <label className="form-label">WhatsApp Opt-In</label>
              <select value={form.whatsapp_opted_in} onChange={e => set('whatsapp_opted_in', e.target.value)} className="form-select">
                <option value="false">Not opted in</option>
                <option value="true">✅ Opted in — parent/guardian has consented</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-3">
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href={`/learners/${learner.learner_id}`} className="btn-secondary">Cancel</Link>
        </div>

        {/* Withdraw */}
        {learner.programme_status !== 'withdrawn' && (
          <div className="flex items-center gap-3">
            {confirmWithdraw && (
              <span className="text-sm text-red-600">This will mark the learner as withdrawn. Confirm?</span>
            )}
            <button type="button" onClick={handleWithdraw} disabled={withdrawing}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                confirmWithdraw
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-200 text-red-600 hover:bg-red-50'
              )}>
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
              {withdrawing ? 'Withdrawing…' : confirmWithdraw ? 'Yes, Withdraw' : 'Withdraw Learner'}
            </button>
            {confirmWithdraw && (
              <button type="button" onClick={() => setConfirmWithdraw(false)}
                className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
