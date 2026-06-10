'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, UserPlus, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils';
import DarkCombobox from '@/components/ui/DarkCombobox';

const schema = z.object({
  first_name:      z.string().min(1, 'Required'),
  last_name:       z.string().min(1, 'Required'),
  grade:           z.coerce.number().int().min(8).max(12),
  school_id:       z.string().min(1, 'Select a school'),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  phone:           z.string().optional(),
  parent_name:     z.string().optional(),
  parent_contact:  z.string().optional(),
  enrollment_date: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  schools:  Array<{ school_id: string; school_name: string }>;
  programs: Array<{ program_id: string; program_name: string; program_type: string }>;
}

export default function NewLearnerForm({ schools, programs }: Props) {
  const router = useRouter();
  const [loading, setLoading]           = useState(false);
  const [selectedPrograms, setSelected] = useState<string[]>([]);
  const [programError, setProgramError] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      enrollment_date: new Date().toISOString().slice(0, 10),
      grade: 10,
    },
  });
  const schoolId = watch('school_id') || '';

  const toggleProgram = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setProgramError('');
  };

  const onSubmit = async (data: FormData) => {
    if (selectedPrograms.length === 0) {
      setProgramError('Select at least one programme');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/learners', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          grade:       Number(data.grade),
          email:       data.email || undefined,
          program_ids: selectedPrograms,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register learner');
      toast.success(`Learner registered — ${json.data?.learner_code}`);
      router.push('/learners');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* Personal info */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">First Name <span className="text-red-500">*</span></label>
            <input {...register('first_name')} className="form-input" placeholder="Nomvula" />
            {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="form-label">Last Name <span className="text-red-500">*</span></label>
            <input {...register('last_name')} className="form-input" placeholder="Dlamini" />
            {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input type="email" {...register('email')} className="form-input" placeholder="learner@school.edu.za" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">Phone Number</label>
            <input type="tel" {...register('phone')} className="form-input" placeholder="082 000 0000" />
          </div>
        </div>
      </div>

      {/* Academic info */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
          Academic Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">School <span className="text-red-500">*</span></label>
            <DarkCombobox
              options={schools.map(s => ({ value: s.school_id, label: s.school_name }))}
              value={schoolId}
              onChange={v => setValue('school_id', v, { shouldValidate: true })}
              placeholder="Select school…"
              error={!!errors.school_id}
            />
            {errors.school_id && <p className="form-error">{errors.school_id.message}</p>}
          </div>
          <div>
            <label className="form-label">Grade <span className="text-red-500">*</span></label>
            <select {...register('grade')} className="form-select">
              {[8, 9, 10, 11, 12].map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
            {errors.grade && <p className="form-error">{errors.grade.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Enrollment Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('enrollment_date')} className="form-input sm:max-w-xs" />
            {errors.enrollment_date && <p className="form-error">{errors.enrollment_date.message}</p>}
          </div>
        </div>
      </div>

      {/* Programme selection — multi-select */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1 pb-2 border-b border-gray-100">
          Programmes <span className="text-red-500">*</span>
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Select all programmes this learner will attend. You can select more than one.
        </p>

        {programs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            No active programmes found.{' '}
            <a href="/programs/new" className="text-brand-700 hover:underline">Create a programme first.</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {programs.map(p => {
              const checked = selectedPrograms.includes(p.program_id);
              return (
                <button
                  key={p.program_id}
                  type="button"
                  onClick={() => toggleProgram(p.program_id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
                    checked
                      ? 'border-brand-400 bg-brand-50 shadow-sm'
                      : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                  )}>
                  <span className={cn('shrink-0 transition-colors', checked ? 'text-brand-700' : 'text-gray-300')}>
                    {checked
                      ? <CheckSquare className="w-5 h-5" />
                      : <Square className="w-5 h-5" />}
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
        )}

        {/* Summary */}
        {selectedPrograms.length > 0 && (
          <p className="mt-2 text-xs text-brand-700 font-medium">
            ✓ {selectedPrograms.length} programme{selectedPrograms.length > 1 ? 's' : ''} selected
          </p>
        )}
        {programError && <p className="form-error mt-1">{programError}</p>}
      </div>

      {/* Parent info */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
          Parent / Guardian
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Parent / Guardian Name</label>
            <input {...register('parent_name')} className="form-input" placeholder="Thandi Dlamini" />
          </div>
          <div>
            <label className="form-label">Parent / Guardian Contact</label>
            <input type="tel" {...register('parent_contact')} className="form-input" placeholder="083 000 0000" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {loading ? 'Registering…' : 'Register Learner'}
        </button>
        <Link href="/learners" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
