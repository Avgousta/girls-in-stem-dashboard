'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Calendar, Award, ChevronRight, LayoutGrid, List, Search } from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';

interface Project {
  id: string; name: string; description: string; stage: string; status: string;
  score: number | null; max_score: number; due_date: string | null; submitted_at: string | null;
  learner: string; learner_code: string; grade: number; school: string;
  programme: string; prog_type: string; pct: number | null;
}
interface Stage  { key: string; label: string; color: string; bg: string }
interface Props  {
  projects: Project[]; stages: readonly Stage[];
  programs: Array<{ program_id: string; program_name: string }>;
  isAdmin: boolean;
}

const STAGE_ICONS: Record<string, string> = {
  planning: '📋', in_progress: '⚙️', review: '🔍', submitted: '📤', marked: '✅',
};

const scoreColor = (pct: number | null) =>
  pct === null ? DS.textMuted as string : pct >= 75 ? 'var(--ds-success)' : pct >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)';

const isOverdue = (due: string | null) => due && new Date(due) < new Date();

const selectSt: React.CSSProperties = {
  background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '7px 10px', fontSize: '13px', outline: 'none', colorScheme: 'dark',
};

export default function ProjectBoard({ projects: initial, stages, isAdmin }: Props) {
  const [projects,  setProjects] = useState(initial);
  const [view,      setView]     = useState<'board' | 'list'>('board');
  const [search,    setSearch]   = useState('');
  const [loading,   setLoading]  = useState<string | null>(null);
  const [filterProg,setFilter]   = useState('');

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.name.toLowerCase().includes(q) ||
      p.learner.toLowerCase().includes(q) ||
      p.programme.toLowerCase().includes(q);
    const matchProg = !filterProg || p.programme === filterProg;
    return matchSearch && matchProg;
  });

  const programmes = Array.from(new Set(projects.map(p => p.programme))).sort();

  const moveStage = async (projectId: string, newStage: string) => {
    setLoading(projectId);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/stage`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, stage: newStage } : p));
      toast.success(`Moved to ${stages.find(s => s.key === newStage)?.label}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search project, learner, programme…"
            className="form-input pl-9 py-2 text-sm w-full" />
        </div>
        <select value={filterProg} onChange={e => setFilter(e.target.value)} style={{ ...selectSt, width: 'auto' }}>
          <option value="">All programmes</option>
          {programmes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: DS.surfaceHover }}>
          <button onClick={() => setView('board')}
            className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            style={view === 'board'
              ? { background: DS.primary, color: '#fff' }
              : { background: 'transparent', color: DS.textMid as string }}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')}
            className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            style={view === 'list'
              ? { background: DS.primary, color: '#fff' }
              : { background: 'transparent', color: DS.textMid as string }}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOARD VIEW */}
      {view === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {stages.map(stage => {
            const stageProjects = filtered.filter(p => p.stage === stage.key);
            return (
              <div key={stage.key} className="rounded-2xl overflow-hidden"
                style={{ border: `2px solid ${stage.color}30`, background: DS.surface }}>
                <div className="px-3 py-2.5 flex items-center justify-between"
                  style={{ background: `${stage.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span>{STAGE_ICONS[stage.key]}</span>
                    <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.label}</span>
                  </div>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: stage.color }}>
                    {stageProjects.length}
                  </span>
                </div>

                <div className="p-2 space-y-2 min-h-[60px]">
                  {stageProjects.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: DS.borderLight }}>No projects</p>
                  )}
                  {stageProjects.map(p => (
                    <div key={p.id} className="rounded-xl p-3 transition-all group"
                      style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}
                      onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.border = `1px solid ${DS.primary}`; }}
                      onMouseOut={e =>  { (e.currentTarget as HTMLDivElement).style.border = `1px solid ${DS.border}`; }}>
                      <Link href={`/projects/${p.id}`} className="block">
                        <p className="text-sm font-semibold leading-tight line-clamp-2"
                          style={{ color: DS.text }}>{p.name}</p>
                        <p className="text-xs mt-1" style={{ color: DS.textMid }}>{p.learner}</p>
                        <p className="text-xs" style={{ color: DS.textMuted }}>{p.programme}</p>
                      </Link>

                      <div className="flex items-center justify-between mt-2 pt-2"
                        style={{ borderTop: `1px solid ${DS.borderLight}` }}>
                        {p.pct !== null ? (
                          <span className="text-xs font-bold" style={{ color: scoreColor(p.pct) }}>
                            <Award className="w-3 h-3 inline mr-0.5" />{p.pct}%
                          </span>
                        ) : p.due_date ? (
                          <span className="text-xs" style={{ color: isOverdue(p.due_date) ? 'var(--ds-danger)' : DS.textMuted as string,
                            fontWeight: isOverdue(p.due_date) ? 700 : 400 }}>
                            <Calendar className="w-3 h-3 inline mr-0.5" />
                            {isOverdue(p.due_date) ? 'Overdue' : fmt.date(p.due_date)}
                          </span>
                        ) : <span />}

                        {isAdmin && (
                          <select
                            value={p.stage}
                            onChange={e => moveStage(p.id, e.target.value)}
                            disabled={loading === p.id}
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] rounded px-1 py-0.5 cursor-pointer focus:outline-none"
                            style={{ background: DS.surface as string, border: `1px solid ${DS.border}`, color: DS.textMid as string }}>
                            {stages.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        )}
                        {loading === p.id && <Loader2 className="w-3 h-3 animate-spin" style={{ color: DS.textMuted }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Project','Learner','Programme','Stage','Score','Due',''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
                    borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const stage = stages.find(s => s.key === p.stage);
                return (
                  <tr key={p.id || i} style={{ borderBottom: `1px solid ${DS.borderLight}` }}
                    onMouseOver={e => { (e.currentTarget as HTMLTableRowElement).style.background = DS.surfaceHover as string; }}
                    onMouseOut={e =>  { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`}
                        className="font-semibold hover:underline" style={{ color: DS.text }}>
                        {p.name}
                      </Link>
                      {p.description && (
                        <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: DS.textMuted }}>{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: DS.text }}>{p.learner}</p>
                      <p className="text-xs" style={{ color: DS.textMuted }}>Gr {p.grade} · {p.school}</p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{p.programme}</td>
                    <td className="px-4 py-3">
                      {stage && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: `${stage.color}20`, color: stage.color }}>
                          {STAGE_ICONS[stage.key]} {stage.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.pct !== null
                        ? <span className="font-mono font-bold text-sm" style={{ color: scoreColor(p.pct) }}>{p.pct}%</span>
                        : <span style={{ color: DS.borderLight }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.due_date
                        ? <span className="text-xs" style={{
                            color: isOverdue(p.due_date) ? 'var(--ds-danger)' : DS.textMuted as string,
                            fontWeight: isOverdue(p.due_date) ? 700 : 400,
                          }}>
                            {isOverdue(p.due_date) ? '⚠ ' : ''}{fmt.date(p.due_date)}
                          </span>
                        : <span className="text-xs" style={{ color: DS.borderLight }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`}
                        className="text-xs font-medium flex items-center gap-0.5 hover:underline"
                        style={{ color: DS.primary }}>
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>No projects match your filters.</div>
          )}
        </div>
      )}
    </div>
  );
}
