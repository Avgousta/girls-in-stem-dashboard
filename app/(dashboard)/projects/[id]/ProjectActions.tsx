'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, MoveRight } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

interface Props {
  project: { id: string; stage: string; score: number | null; max_score: number; due_date: string | null };
  stages:  readonly { key: string; label: string; color: string; bg: string }[];
  isAdmin: boolean;
}

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '5px', color: DS.textMuted as string,
};
const inputSt: React.CSSProperties = {
  width: '100%', background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '8px 10px', fontSize: '13px', outline: 'none',
};

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
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
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
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setLoad(false); }
  };

  if (!isAdmin) return null;

  const pctVal = score && maxSc ? Math.round(Number(score) / Number(maxSc) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 space-y-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>Update Project</h3>

        <div>
          <label style={labelSt}>Stage</label>
          <select value={stage} onChange={e => setStage(e.target.value)} style={inputSt}>
            {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelSt}>Due Date</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} style={inputSt} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelSt}>Score</label>
            <input type="number" value={score} onChange={e => setScore(e.target.value)}
              style={inputSt} placeholder="—" min={0} max={Number(maxSc)} />
          </div>
          <div>
            <label style={labelSt}>Out of</label>
            <input type="number" value={maxSc} onChange={e => setMaxSc(e.target.value)}
              style={inputSt} min={1} />
          </div>
        </div>

        {pctVal !== null && (
          <div className="text-center py-3 rounded-xl" style={{ background: DS.surfaceHover }}>
            <p className="text-2xl font-bold tabular-nums"
              style={{ color: pctVal >= 75 ? 'var(--ds-success)' : pctVal >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)' }}>
              {pctVal}%
            </p>
          </div>
        )}

        <button onClick={save} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {nextStage && (
        <button onClick={advanceStage} disabled={loading}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all cursor-pointer"
          style={{ borderColor: nextStage.color, background: `${nextStage.color}15`, color: nextStage.color }}>
          <span>Move to {nextStage.label}</span>
          <MoveRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
