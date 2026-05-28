'use client';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn, calcGradeBand, pct, today } from '@/utils';
import type { Learner } from '@/types';

const schema = z.object({
  learner_id:      z.string().min(1, 'Select a learner'),
  program_id:      z.string().min(1, 'Select a programme'),
  subject:         z.string().min(1, 'Subject is required'),
  score:           z.coerce.number().min(0, 'Score must be ≥ 0'),
  max_score:       z.coerce.number().min(1, 'Max score must be > 0').default(100),
  assessment_date: z.string().min(1, 'Date is required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  programs: Array<{ program_id: string; program_name: string }>;
  currentUserId: string;
  onSuccess?: () => void;
}

const GRADE_STYLES = {
  Distinction:    'bg-brand-100 text-brand-800 border-brand-300',
  Merit:          'bg-mint-400/10 text-mint-700 border-mint-400/30',
  Pass:           'bg-yellow-50 text-yellow-700 border-yellow-300',
  'Needs Support':'bg-red-50 text-red-700 border-red-300',
};

export default function AssessmentForm({ programs, currentUserId, onSuccess }: Props) {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { max_score: 100, assessment_date: today() },
  });

  const programId = watch('program_id');
  const score    = watch('score');
  const maxScore = watch('max_score') || 100;
  const percentage = score !== undefined && score !== null ? pct(Number(score), Number(maxScore)) : null;
  const gradeBand = percentage !== null ? calcGradeBand(percentage) : null;

  useEffect(() => {
    if (!programId) { setLearners([]); return; }
    fetch(`/api/v1/programs/${programId}/learners`)
      .then(r => r.json())
      .then(({ data }) => setLearners(data || []));
  }, [programId]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, captured_by: currentUserId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Assessment saved — ${gradeBand} (${percentage}%)`);
      reset({ max_score: 100, assessment_date: today(), program_id: data.program_id });
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Programme <span className="text-red-500">*</span></label>
          <select {...register('program_id')} className="form-select">
            <option value="">Select programme…</option>
            {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
          </select>
          {errors.program_id && <p className="form-error">{errors.program_id.message}</p>}
        </div>
        <div>
          <label className="form-label">Learner <span className="text-red-500">*</span></label>
          <select {...register('learner_id')} className="form-select" disabled={!programId}>
            <option value="">{programId ? 'Select learner…' : 'Select programme first'}</option>
            {learners.map(l => (
              <option key={l.learner_id} value={l.learner_id}>
                {l.full_name || `${l.first_name} ${l.last_name}`}
              </option>
            ))}
          </select>
          {errors.learner_id && <p className="form-error">{errors.learner_id.message}</p>}
        </div>
        <div>
          <label className="form-label">Subject / Assessment Title <span className="text-red-500">*</span></label>
          <input {...register('subject')} className="form-input" placeholder="e.g. Python Basics" />
          {errors.subject && <p className="form-error">{errors.subject.message}</p>}
        </div>
        <div>
          <label className="form-label">Assessment Date <span className="text-red-500">*</span></label>
          <input type="date" {...register('assessment_date')} className="form-input" />
          {errors.assessment_date && <p className="form-error">{errors.assessment_date.message}</p>}
        </div>
        <div>
          <label className="form-label">Score <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" {...register('score')} className="form-input" placeholder="78" min={0} />
          {errors.score && <p className="form-error">{errors.score.message}</p>}
        </div>
        <div>
          <label className="form-label">Max Score</label>
          <input type="number" step="0.01" {...register('max_score')} className="form-input" placeholder="100" />
          {errors.max_score && <p className="form-error">{errors.max_score.message}</p>}
        </div>
      </div>

      {/* Live grade preview */}
      {percentage !== null && gradeBand && (
        <div className={cn('flex items-center gap-4 p-4 rounded-xl border', GRADE_STYLES[gradeBand])}>
          <div>
            <p className="text-xs font-medium opacity-70 uppercase tracking-wide">Calculated Score</p>
            <p className="text-2xl font-bold tabular-nums">{percentage}%</p>
          </div>
          <div className="w-px h-10 bg-current opacity-20" />
          <div>
            <p className="text-xs font-medium opacity-70 uppercase tracking-wide">Grade Band</p>
            <p className="text-lg font-bold">{gradeBand}</p>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Saving…' : 'Save Assessment'}
      </button>
    </form>
  );
}
