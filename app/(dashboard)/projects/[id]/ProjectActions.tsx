'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, MoveRight } from 'lucide-react';

interface Props {
  project: { id: string; stage: string; score: number | null; max_score: number; due_date: string | null };
  stages:  readonly { key: string; label: string; color: string; bg: string }[];
  isAdmin: boolean;
}

export default function ProjectActions({ project, stages, isAdmin }: Props) {
  const router  = useRouter();
  const [stage, setStage]   = useState(project.stage);
  const [score, setScore]   = useState(project.score?.toString() ?? '');
  const [maxSc, setMaxSc]   = useState(project.max_score?.toString() ?? '100');
  const [due,   setDue]     = useState(project.due_date ?? '');
  const [loading, setLoad]  = useState(false);

  const save = async () => {
    setLoad(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          score:     score !== '' ? Number(score) : null,
          max_score: Number(maxSc) || 100,
          due_date:  due || null,
          completion_status: stage === 'marked' ? 'completed' : stage === 'planning' ? 'not_started' : 'in_progress',
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Project updated');
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoad(false); }
  };

  const currentIdx = stages.findIndex(s => s.key === stage);
  const nextStage  = stages[currentIdx + 1];

  const advanceStage = async () => {
    if (!nextStage) return;
    setStage(nextStage.key);
    setLoad(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/stage`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage.key }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Moved to ${nextStage.label}`);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoad(false); }
  };

  if (!isAdmin) return null;

  const stageInfo = stages.find(s => s.key === stage);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Update Project</h3>

        <div>
          <label className="form-label">Stage</label>
          <select value={stage} onChange={e => setStage(e.target.value)} className="form-select">
            {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">Due Date</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className="form-input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Score</label>
            <input type="number" value={score} onChange={e => setScore(e.target.value)}
              className="form-input" placeholder="—" min={0} max={Number(maxSc)} />
          </div>
          <div>
            <label className="form-label">Out of</label>
            <input type="number" value={maxSc} onChange={e => setMaxSc(e.target.value)}
              className="form-input" min={1} />
          </div>
        </div>

        {score && maxSc && (
          <div className="text-center py-2 rounded-xl bg-gray-50">
            <p className="text-2xl font-bold tabular-nums"
              style={{ color: (Number(score)/Number(maxSc)*100) >= 75 ? '#16A34A' : (Number(score)/Number(maxSc)*100) >= 50 ? '#D97706' : '#DC2626' }}>
              {Math.round(Number(score)/Number(maxSc)*100)}%
            </p>
          </div>
        )}

        <button onClick={save} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Quick advance stage */}
      {nextStage && (
        <button onClick={advanceStage} disabled={loading}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all hover:shadow-md"
          style={{ borderColor: nextStage.color, background: nextStage.bg, color: nextStage.color }}>
          <span>Move to {nextStage.label}</span>
          <MoveRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
