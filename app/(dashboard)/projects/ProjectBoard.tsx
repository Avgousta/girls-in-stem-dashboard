'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Calendar, Award, ChevronRight, LayoutGrid, List, Search } from 'lucide-react';
import { cn, fmt } from '@/utils';

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

  const programmes = [...new Set(projects.map(p => p.programme))].sort();

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
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(null); }
  };

  const scoreColor = (pct: number | null) => {
    if (pct === null) return 'text-gray-400';
    if (pct >= 75) return 'text-mint-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isOverdue = (due: string | null) =>
    due && new Date(due) < new Date() ? true : false;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search project, learner, programme…"
            className="form-input pl-9 py-2 text-sm w-full" />
        </div>
        <select value={filterProg} onChange={e => setFilter(e.target.value)}
          className="form-select py-2 text-sm w-auto">
          <option value="">All programmes</option>
          {programmes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('board')}
            className={cn('px-3 py-1.5 rounded text-sm font-medium transition-all',
              view === 'board' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')}
            className={cn('px-3 py-1.5 rounded text-sm font-medium transition-all',
              view === 'list' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500')}>
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
              <div key={stage.key} className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: stage.color + '30' }}>
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between"
                  style={{ background: stage.bg }}>
                  <div className="flex items-center gap-2">
                    <span>{STAGE_ICONS[stage.key]}</span>
                    <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.label}</span>
                  </div>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: stage.color }}>
                    {stageProjects.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[60px]">
                  {stageProjects.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-4">No projects</p>
                  )}
                  {stageProjects.map(p => (
                    <div key={p.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow group">
                      <Link href={`/projects/${p.id}`} className="block">
                        <p className="text-sm font-semibold text-gray-800 leading-tight group-hover:text-brand-700 transition-colors line-clamp-2">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{p.learner}</p>
                        <p className="text-xs text-gray-400">{p.programme}</p>
                      </Link>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        {p.pct !== null ? (
                          <span className={`text-xs font-bold ${scoreColor(p.pct)}`}>
                            <Award className="w-3 h-3 inline mr-0.5" />{p.pct}%
                          </span>
                        ) : p.due_date ? (
                          <span className={`text-xs ${isOverdue(p.due_date) ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                            <Calendar className="w-3 h-3 inline mr-0.5" />
                            {isOverdue(p.due_date) ? 'Overdue' : fmt.date(p.due_date)}
                          </span>
                        ) : <span />}

                        {/* Move stage dropdown */}
                        {isAdmin && (
                          <select
                            value={p.stage}
                            onChange={e => moveStage(p.id, e.target.value)}
                            disabled={loading === p.id}
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-500 bg-gray-50 cursor-pointer hover:border-brand-300 focus:outline-none">
                            {stages.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        )}
                        {loading === p.id && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr key="hdr">
                <th key="name">Project</th>
                <th key="learner">Learner</th>
                <th key="prog">Programme</th>
                <th key="stage">Stage</th>
                <th key="score">Score</th>
                <th key="due">Due</th>
                <th key="act"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const stage = stages.find(s => s.key === p.stage);
                return (
                  <tr key={p.id || i}>
                    <td key="name">
                      <Link href={`/projects/${p.id}`}
                        className="font-semibold text-gray-800 hover:text-brand-700 hover:underline">
                        {p.name}
                      </Link>
                      {p.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td key="learner">
                      <p className="text-sm font-medium">{p.learner}</p>
                      <p className="text-xs text-gray-400">Gr {p.grade} · {p.school}</p>
                    </td>
                    <td key="prog" className="text-xs text-gray-500">{p.programme}</td>
                    <td key="stage">
                      {stage && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: stage.bg, color: stage.color }}>
                          {STAGE_ICONS[stage.key]} {stage.label}
                        </span>
                      )}
                    </td>
                    <td key="score">
                      {p.pct !== null
                        ? <span className={`font-mono font-bold text-sm ${scoreColor(p.pct)}`}>{p.pct}%</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td key="due">
                      {p.due_date
                        ? <span className={`text-xs ${isOverdue(p.due_date) ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            {isOverdue(p.due_date) ? '⚠ ' : ''}{fmt.date(p.due_date)}
                          </span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td key="act">
                      <Link href={`/projects/${p.id}`}
                        className="text-xs text-brand-700 hover:underline font-medium flex items-center gap-0.5">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">No projects match your filters.</div>
          )}
        </div>
      )}
    </div>
  );
}
