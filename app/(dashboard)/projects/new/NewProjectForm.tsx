'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, FolderKanban } from 'lucide-react';
import Link from 'next/link';

interface Learner  { learner_id: string; learner_code: string; full_name: string; school_name: string }
interface Program  { program_id: string; program_name: string; program_type: string }
interface Props    { learners: Learner[]; programs: Program[] }

const STAGES = [
  { key: 'planning',    label: 'Planning' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review',      label: 'Under Review' },
  { key: 'submitted',   label: 'Submitted' },
  { key: 'marked',      label: 'Marked' },
];

export default function NewProjectForm({ learners, programs }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [form, setForm] = useState({
    learner_id:   '',
    program_id:   '',
    project_name: '',
    description:  '',
    stage:        'planning',
    max_score:    '100',
    due_date:     '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filteredLearners = learners.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.full_name.toLowerCase().includes(q) ||
           l.learner_code.toLowerCase().includes(q) ||
           l.school_name.toLowerCase().includes(q);
  });

  const selectedLearner = learners.find(l => l.learner_id === form.learner_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.learner_id)        { toast.error('Select a learner');    return; }
    if (!form.project_name.trim()){ toast.error('Enter project name'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id:        form.learner_id,
          program_id:        form.program_id   || undefined,
          project_name:      form.project_name.trim(),
          description:       form.description.trim() || undefined,
          stage:             form.stage,
          completion_status: form.stage === 'planning' ? 'not_started' : 'in_progress',
          max_score:         Number(form.max_score) || 100,
          due_date:          form.due_date || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create project');
      toast.success('Project created');
      router.push(`/projects/${json.data.project_id}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Learner selector */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
          Learner
        </h2>
        {selectedLearner ? (
          <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold">
                {selectedLearner.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
              <div>
                <p className="font-semibold text-brand-800">{selectedLearner.full_name}</p>
                <p className="text-xs text-brand-600">{selectedLearner.learner_code} · {selectedLearner.school_name}</p>
              </div>
            </div>
            <button type="button" onClick={() => { set('learner_id',''); setSearch(''); }}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium">Change</button>
          </div>
        ) : (
          <div className="space-y-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search learner by name, code or school…"
              className="form-input w-full" />
            {search && (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {filteredLearners.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No learners found</p>
                ) : filteredLearners.slice(0, 20).map(l => (
                  <button key={l.learner_id} type="button"
                    onClick={() => { set('learner_id', l.learner_id); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50 text-left transition-colors border-b border-gray-100 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {l.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{l.full_name}</p>
                      <p className="text-xs text-gray-400">{l.learner_code} · {l.school_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project details */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
          Project Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="form-label">Project Name <span className="text-red-500">*</span></label>
            <input value={form.project_name} onChange={e => set('project_name', e.target.value)}
              className="form-input" placeholder="e.g. Arduino Line-Following Robot" />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} className="form-input"
              placeholder="Brief overview of what the learner will build or create…" />
          </div>
          <div>
            <label className="form-label">Programme</label>
            <select value={form.program_id} onChange={e => set('program_id', e.target.value)} className="form-select">
              <option value="">No programme</option>
              {programs.map(p => (
                <option key={p.program_id} value={p.program_id}>{p.program_name} — {p.program_type}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Initial Stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} className="form-select">
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Max Score (marks)</label>
              <input type="number" value={form.max_score} onChange={e => set('max_score', e.target.value)}
                className="form-input" min={1} max={1000} />
            </div>
          </div>
          <div>
            <label className="form-label">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
              className="form-input" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderKanban className="w-4 h-4" />}
          {loading ? 'Creating…' : 'Create Project'}
        </button>
        <Link href="/projects" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
