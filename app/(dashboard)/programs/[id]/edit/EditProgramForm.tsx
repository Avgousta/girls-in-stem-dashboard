'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

const PROGRAM_TYPES = [
  { value: 'Coding',             label: 'Coding' },
  { value: 'Robotics',           label: 'Robotics' },
  { value: 'Coding & Robotics',  label: 'Coding & Robotics' },
  { value: 'Mathematics',        label: 'Mathematics' },
  { value: 'Science',            label: 'Science' },
  { value: 'Math & Science',     label: 'Math & Science' },
  { value: 'Data Science',       label: 'Data Science' },
  { value: 'Design/Tech',        label: 'Design / Tech' },
  { value: 'AI/ML',              label: 'AI / Machine Learning' },
  { value: 'Electronics',        label: 'Electronics' },
];

const schema = z.object({
  program_name:  z.string().min(2, 'Name must be at least 2 characters'),
  program_type:  z.string().min(1, 'Select a type'),
  start_date:    z.string().min(1, 'Required'),
  end_date:      z.string().optional(),
  instructor_id: z.string().optional(),
  max_capacity:  z.coerce.number().int().min(1).max(500),
  description:   z.string().optional(),
  is_active:     z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Program {
  program_id:    string;
  program_name:  string;
  program_type:  string;
  start_date:    string;
  end_date:      string | null;
  instructor_id: string | null;
  max_capacity:  number;
  description:   string | null;
  is_active:     boolean;
}

interface Props {
  program:     Program;
  instructors: Array<{ user_id: string; full_name: string }>;
}

export default function EditProgramForm({ program, instructors }: Props) {
  const router  = useRouter();
  const [saving,         setSaving]        = useState(false);
  const [deleting,       setDeleting]      = useState(false);
  const [confirmDelete,  setConfirmDelete] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      program_name:  program.program_name,
      program_type:  program.program_type,
      start_date:    program.start_date,
      end_date:      program.end_date    || '',
      instructor_id: program.instructor_id || '',
      max_capacity:  program.max_capacity,
      description:   program.description || '',
      is_active:     program.is_active,
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        end_date:      data.end_date      || undefined,
        instructor_id: data.instructor_id || undefined,
        description:   data.description   || undefined,
      };
      const res = await fetch(`/api/v1/programs/${program.program_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update');
      toast.success('Programme updated successfully');
      router.push('/programs');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/programs/${program.program_id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      toast.success('Programme deactivated');
      router.push('/programs');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="sm:col-span-2">
          <label className="form-label">Programme Name <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
          <input {...register('program_name')} className="form-input" />
          {errors.program_name && <p className="form-error">{errors.program_name.message}</p>}
        </div>

        <div>
          <label className="form-label">Programme Type <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
          <select {...register('program_type')} className="form-select">
            {PROGRAM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {errors.program_type && <p className="form-error">{errors.program_type.message}</p>}
        </div>

        <div>
          <label className="form-label">Status</label>
          <select {...register('is_active', { setValueAs: v => v === 'true' || v === true })} className="form-select">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div>
          <label className="form-label">Max Learners</label>
          <input type="number" {...register('max_capacity')} className="form-input" min={1} max={500} />
          {errors.max_capacity && <p className="form-error">{errors.max_capacity.message}</p>}
        </div>

        <div>
          <label className="form-label">Lead Instructor</label>
          <select {...register('instructor_id')} className="form-select">
            <option value="">None assigned</option>
            {instructors.map(i => (
              <option key={i.user_id} value={i.user_id}>{i.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Start Date <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
          <input type="date" {...register('start_date')} className="form-input" />
          {errors.start_date && <p className="form-error">{errors.start_date.message}</p>}
        </div>

        <div>
          <label className="form-label">End Date</label>
          <input type="date" {...register('end_date')} className="form-input" />
          <p className="text-xs mt-1" style={{ color: DS.textMuted }}>Leave blank if ongoing.</p>
        </div>

        <div className="sm:col-span-2">
          <label className="form-label">Description</label>
          <textarea {...register('description')} rows={4} className="form-input" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 flex-wrap gap-3"
        style={{ borderTop: `1px solid ${DS.border}` }}>
        <div className="flex gap-3">
          <button type="submit" disabled={saving || !isDirty} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href="/programs" className="btn-secondary">Cancel</Link>
        </div>

        <div className="flex items-center gap-3">
          {confirmDelete && (
            <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--ds-danger)' }}>
              <AlertTriangle className="w-4 h-4" />
              This will deactivate the programme. Confirm?
            </span>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer"
            style={confirmDelete
              ? { background: 'var(--ds-danger)', color: '#fff' }
              : { border: '1px solid var(--ds-danger)', color: 'var(--ds-danger)', background: 'var(--ds-danger-light)' }}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Deactivating…' : confirmDelete ? 'Yes, Deactivate' : 'Deactivate'}
          </button>
          {confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(false)}
              className="text-sm cursor-pointer" style={{ color: DS.textMuted }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
