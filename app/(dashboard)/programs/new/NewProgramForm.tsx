'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, BookOpen } from 'lucide-react';
import Link from 'next/link';

const PROGRAM_TYPES = [
  { value: 'Coding',              label: 'Coding' },
  { value: 'Robotics',            label: 'Robotics' },
  { value: 'Coding & Robotics',   label: 'Coding & Robotics' },
  { value: 'Mathematics',         label: 'Mathematics' },
  { value: 'Science',             label: 'Science' },
  { value: 'Math & Science',      label: 'Math & Science' },
  { value: 'Data Science',        label: 'Data Science' },
  { value: 'Design/Tech',         label: 'Design / Tech' },
  { value: 'AI/ML',               label: 'AI / Machine Learning' },
  { value: 'Electronics',         label: 'Electronics' },
];

const schema = z.object({
  program_name:  z.string().min(2, 'Name must be at least 2 characters'),
  program_type:  z.string().min(1, 'Select a type'),
  start_date:    z.string().min(1, 'Required'),
  end_date:      z.string().optional(),
  instructor_id: z.string().optional(),
  max_capacity:  z.coerce.number().int().min(1).max(500).default(30),
  description:   z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  instructors: Array<{ user_id: string; full_name: string }>;
}

export default function NewProgramForm({ instructors }: Props) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { max_capacity: 30 },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Clean up optional fields — send undefined instead of empty string
      const payload = {
        ...data,
        end_date:      data.end_date      || undefined,
        instructor_id: data.instructor_id || undefined,
        description:   data.description   || undefined,
      };
      const res = await fetch('/api/v1/programs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create programme');
      toast.success(`Programme created: ${data.program_name}`);
      router.push('/programs');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Programme Name — full width */}
        <div className="sm:col-span-2">
          <label className="form-label">Programme Name <span className="text-red-500">*</span></label>
          <input {...register('program_name')} className="form-input"
            placeholder="e.g. Girls in STEM — Coding & Robotics 2025" />
          {errors.program_name && <p className="form-error">{errors.program_name.message}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="form-label">Programme Type <span className="text-red-500">*</span></label>
          <select {...register('program_type')} className="form-select">
            <option value="">Select type…</option>
            {PROGRAM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {errors.program_type && <p className="form-error">{errors.program_type.message}</p>}
        </div>

        {/* Max capacity */}
        <div>
          <label className="form-label">Max Learners</label>
          <input type="number" {...register('max_capacity')} className="form-input" min={1} max={500}
            placeholder="30" />
          <p className="text-xs text-gray-400 mt-1">
            Learners from any school can be enrolled — no school limit.
          </p>
          {errors.max_capacity && <p className="form-error">{errors.max_capacity.message}</p>}
        </div>

        {/* Instructor */}
        <div>
          <label className="form-label">Lead Instructor <span className="text-red-500">*</span></label>
          <select {...register('instructor_id')} className="form-select">
            <option value="">Select instructor…</option>
            {instructors.map(i => (
              <option key={i.user_id} value={i.user_id}>{i.full_name}</option>
            ))}
          </select>
          {errors.instructor_id && <p className="form-error">{errors.instructor_id.message}</p>}
        </div>

        {/* Start date */}
        <div>
          <label className="form-label">Start Date <span className="text-red-500">*</span></label>
          <input type="date" {...register('start_date')} className="form-input" />
          {errors.start_date && <p className="form-error">{errors.start_date.message}</p>}
        </div>

        {/* End date */}
        <div>
          <label className="form-label">End Date</label>
          <input type="date" {...register('end_date')} className="form-input" />
          <p className="text-xs text-gray-400 mt-1">Leave blank if ongoing.</p>
        </div>

        {/* Description — full width */}
        <div className="sm:col-span-2">
          <label className="form-label">Description</label>
          <textarea {...register('description')} rows={3} className="form-input"
            placeholder="What will learners do in this programme? Goals, topics, outcomes…" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
        <strong>Note:</strong> Programmes are not tied to a single school. When you enroll learners,
        each learner brings their school with them — so one programme can include learners from
        UJ Academy, Vorentoe, Diepdale and any other school all in the same class.
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {loading ? 'Creating…' : 'Create Programme'}
        </button>
        <Link href="/programs" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
