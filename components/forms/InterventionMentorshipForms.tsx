'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { today } from '@/utils';
import type { Learner } from '@/types';
import DarkCombobox from '@/components/ui/DarkCombobox';

// ══════════════════════════════════════════════════════
// INTERVENTION FORM
// ══════════════════════════════════════════════════════
const interventionSchema = z.object({
  learner_id:     z.string().min(1, 'Select a learner'),
  reason:         z.string().min(5, 'Reason must be at least 5 characters'),
  action_taken:   z.string().optional(),
  follow_up_date: z.string().optional(),
  status:         z.enum(['open', 'in_progress', 'resolved']),
});
type InterventionData = z.infer<typeof interventionSchema>;

interface InterventionProps {
  learners: Learner[];
  currentUserId: string;
  preselectedLearnerId?: string;
  onSuccess?: () => void;
}

export function InterventionForm({ learners, currentUserId, preselectedLearnerId, onSuccess }: InterventionProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InterventionData>({
    resolver: zodResolver(interventionSchema),
    defaultValues: { learner_id: preselectedLearnerId || '', status: 'open' },
  });
  const learnerId = watch('learner_id');

  const onSubmit = async (data: InterventionData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, flagged_by: currentUserId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Intervention logged');
      reset({ status: 'open' });
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Learner <span className="text-red-500">*</span></label>
          <DarkCombobox
            options={learners.map(l => ({ value: l.learner_id, label: l.full_name || `${l.first_name} ${l.last_name}` }))}
            value={learnerId || ''}
            onChange={v => setValue('learner_id', v, { shouldValidate: true })}
            placeholder="Select learner…"
            error={!!errors.learner_id}
          />
          {errors.learner_id && <p className="form-error">{errors.learner_id.message}</p>}
        </div>
        <div>
          <label className="form-label">Status</label>
          <select {...register('status')} className="form-select">
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Reason <span className="text-red-500">*</span></label>
          <textarea {...register('reason')} rows={3} className="form-input"
            placeholder="e.g. Attendance dropped below 75% over the past 4 sessions…" />
          {errors.reason && <p className="form-error">{errors.reason.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Action Taken</label>
          <textarea {...register('action_taken')} rows={2} className="form-input"
            placeholder="e.g. Parent contacted via phone. Counsellor notified." />
        </div>
        <div>
          <label className="form-label">Follow-up Date</label>
          <input type="date" {...register('follow_up_date')} className="form-input" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Saving…' : 'Log Intervention'}
      </button>
    </form>
  );
}

// ══════════════════════════════════════════════════════
// MENTORSHIP FORM
// ══════════════════════════════════════════════════════
const mentorshipSchema = z.object({
  learner_id:       z.string().min(1, 'Select a learner'),
  mentor_id:        z.string().min(1, 'Required'),
  session_date:     z.string().min(1, 'Select a date'),
  duration_minutes: z.coerce.number().min(1).optional(),
  notes:            z.string().optional(),
  next_steps:       z.string().optional(),
});
type MentorshipData = z.infer<typeof mentorshipSchema>;

interface MentorshipProps {
  learners: Learner[];
  mentors: Array<{ user_id: string; full_name: string }>;
  currentUserId: string;
  onSuccess?: () => void;
}

export function MentorshipForm({ learners, mentors, currentUserId, onSuccess }: MentorshipProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MentorshipData>({
    resolver: zodResolver(mentorshipSchema),
    defaultValues: { mentor_id: currentUserId, session_date: today() },
  });
  const learnerId = watch('learner_id');
  const mentorId  = watch('mentor_id');

  const onSubmit = async (data: MentorshipData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/mentorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Mentorship session logged');
      reset({ mentor_id: currentUserId, session_date: today() });
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Learner <span className="text-red-500">*</span></label>
          <DarkCombobox
            options={learners.map(l => ({ value: l.learner_id, label: l.full_name || `${l.first_name} ${l.last_name}` }))}
            value={learnerId || ''}
            onChange={v => setValue('learner_id', v, { shouldValidate: true })}
            placeholder="Select learner…"
            error={!!errors.learner_id}
          />
          {errors.learner_id && <p className="form-error">{errors.learner_id.message}</p>}
        </div>
        <div>
          <label className="form-label">Mentor <span className="text-red-500">*</span></label>
          <DarkCombobox
            options={mentors.map(m => ({ value: m.user_id, label: m.full_name }))}
            value={mentorId || ''}
            onChange={v => setValue('mentor_id', v, { shouldValidate: true })}
            placeholder="Select mentor…"
          />
        </div>
        <div>
          <label className="form-label">Session Date <span className="text-red-500">*</span></label>
          <input type="date" {...register('session_date')} className="form-input" />
          {errors.session_date && <p className="form-error">{errors.session_date.message}</p>}
        </div>
        <div>
          <label className="form-label">Duration (minutes)</label>
          <input type="number" {...register('duration_minutes')} className="form-input" placeholder="60" min={1} />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Session Notes</label>
          <textarea {...register('notes')} rows={3} className="form-input"
            placeholder="What was discussed? Key observations…" />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Next Steps</label>
          <textarea {...register('next_steps')} rows={2} className="form-input"
            placeholder="Action items and follow-up tasks…" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Saving…' : 'Log Mentorship Session'}
      </button>
    </form>
  );
}
