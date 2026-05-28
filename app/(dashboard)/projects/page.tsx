import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FolderKanban, Plus } from 'lucide-react';
import ProjectBoard from './ProjectBoard';

const STAGES = [
  { key: 'planning',    label: 'Planning',    color: '#6B7280', bg: '#F9FAFB' },
  { key: 'in_progress', label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
  { key: 'review',      label: 'Under Review',color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'submitted',   label: 'Submitted',   color: '#2563EB', bg: '#EFF6FF' },
  { key: 'marked',      label: 'Marked',      color: '#16A34A', bg: '#F0FDF4' },
] as const;

async function getProjects() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select(`
      project_id, project_name, description, stage, completion_status,
      score, max_score, due_date, submitted_at, created_at,
      learner_id,
      learners!inner(
        learner_code, grade,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      programs(program_name, program_type)
    `)
    .order('created_at', { ascending: false });

  return (data || []).map((p: any) => ({
    id:          p.project_id,
    name:        p.project_name,
    description: p.description,
    stage:       p.stage || 'planning',
    status:      p.completion_status,
    score:       p.score,
    max_score:   p.max_score,
    due_date:    p.due_date,
    submitted_at:p.submitted_at,
    learner_id:  p.learner_id,
    learner:     `${p.learners?.learner_profiles?.first_name ?? ''} ${p.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    learner_code:p.learners?.learner_code,
    grade:       p.learners?.grade,
    school:      p.learners?.schools?.school_name ?? '—',
    programme:   p.programs?.program_name ?? '—',
    prog_type:   p.programs?.program_type ?? '',
    pct:         p.score != null && p.max_score ? Math.round((p.score / p.max_score) * 100) : null,
  }));
}

async function getPrograms() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('programs').select('program_id, program_name').eq('is_active', true).order('program_name');
  return data || [];
}

export default async function ProjectsPage() {
  const user = await requireAuth(['admin', 'instructor']);
  const [projects, programs] = await Promise.all([getProjects(), getPrograms()]);
  const isAdmin = user.role === 'admin';

  const stageCounts = STAGES.map(s => ({
    ...s,
    count: projects.filter(p => p.stage === s.key).length,
  }));

  return (
    <div className="max-w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-brand-700" /> Projects
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} projects across all programmes</p>
        </div>
        {isAdmin && (
          <Link href="/projects/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Add Project
          </Link>
        )}
      </div>

      {/* Stage summary pills */}
      <div className="flex flex-wrap gap-3">
        {stageCounts.map(s => (
          <div key={s.key}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold"
            style={{ background: s.bg, borderColor: s.color + '40', color: s.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: s.color + '20' }}>{s.count}</span>
          </div>
        ))}
      </div>

      <ProjectBoard projects={projects} stages={STAGES} programs={programs} isAdmin={isAdmin} />
    </div>
  );
}
