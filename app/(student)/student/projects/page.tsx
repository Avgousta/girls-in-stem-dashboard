import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/utils';
import { FolderKanban, Clock, CheckCircle2, Circle } from 'lucide-react';
import ProjectSubmitButton from './ProjectSubmitButton';

export default async function StudentProjectsPage() {
  const user = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners').select('learner_id').eq('user_id', user.user_id).single();
  const learnerId = (learner as any)?.learner_id;

  const { data: projects } = learnerId ? await supabase
    .from('projects')
    .select(`
      project_id, project_name, description, stage, completion_status,
      score, max_score, due_date, submitted_at, file_url, created_at,
      programs(program_name, program_type),
      project_feedback(feedback_id, body, created_at, is_private,
        users!author_id(full_name, role))
    `)
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false }) : { data: [] };

  const list = (projects || []);

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    planning:    { label: 'Planning',     color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: Circle },
    in_progress: { label: 'In Progress',  color: '#D97706', bg: 'rgba(217,119,6,0.1)',   icon: Clock },
    review:      { label: 'Under Review', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)',  icon: Clock },
    submitted:   { label: 'Submitted ✓', color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   icon: CheckCircle2 },
    marked:      { label: 'Marked ✅',   color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   icon: CheckCircle2 },
    not_started: { label: 'Not Started',  color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', icon: Circle },
    completed:   { label: 'Completed',    color: '#2DD4A0', bg: 'rgba(45,212,160,0.1)',  icon: CheckCircle2 },
  };

  const active    = list.filter((p: any) => !['marked','completed'].includes(p.stage || p.completion_status)).length;
  const completed = list.filter((p: any) => ['marked','completed'].includes(p.stage || p.completion_status)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <p className="text-white/50 text-sm mt-0.5">{list.length} projects total</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center bg-white/5 border border-white/10">
          <p className="text-2xl font-bold text-yellow-400 tabular-nums">{active}</p>
          <p className="text-xs text-white/50 mt-0.5">In Progress</p>
        </div>
        <div className="rounded-xl p-3 text-center bg-white/5 border border-white/10">
          <p className="text-2xl font-bold text-mint-400 tabular-nums">{completed}</p>
          <p className="text-xs text-white/50 mt-0.5">Completed</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No projects assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((p: any) => {
            const stageKey = p.stage || p.completion_status || 'not_started';
            const cfg      = STATUS_CONFIG[stageKey] || STATUS_CONFIG.not_started;
            const Icon     = cfg.icon;
            const pct      = p.score != null ? Math.round((p.score / (p.max_score || 100)) * 100) : null;
            const isOverdue = p.due_date && new Date(p.due_date) < new Date() && !['marked','completed','submitted'].includes(stageKey);
            const publicFeedback = (p.project_feedback || []).filter((f: any) => !f.is_private);
            const canSubmit = ['planning','in_progress','review'].includes(stageKey);

            return (
              <div key={p.project_id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{p.project_name}</h3>
                      <p className="text-xs text-white/40 mt-0.5">{p.programs?.program_name}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs text-white/40 line-clamp-2">{p.description}</p>
                  )}

                  {p.due_date && (
                    <p className={`text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-white/40'}`}>
                      {isOverdue ? '⚠ Overdue · ' : '📅 Due '}{fmt.date(p.due_date)}
                    </p>
                  )}

                  {/* Submitted link */}
                  {p.file_url && (
                    <a href={p.file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium">
                      🔗 View Submission
                    </a>
                  )}
                </div>

                {/* Score bar */}
                {pct !== null && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/50">Score</span>
                      <span className="text-sm font-bold tabular-nums"
                        style={{ color: pct >= 75 ? '#2DD4A0' : pct >= 50 ? '#FCD34D' : '#F87171' }}>
                        {p.score}/{p.max_score} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: pct >= 75 ? '#2DD4A0' : pct >= 50 ? '#FCD34D' : '#F87171' }} />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                {canSubmit && (
                  <div className="px-4 pb-4">
                    <ProjectSubmitButton projectId={p.project_id} currentUrl={p.file_url} />
                  </div>
                )}

                {/* Feedback */}
                {publicFeedback.length > 0 && (
                  <div className="border-t border-white/10 p-4 space-y-2">
                    <p className="text-xs font-semibold text-white/50">
                      💬 Teacher Feedback ({publicFeedback.length})
                    </p>
                    {publicFeedback.slice(-2).map((f: any) => (
                      <div key={f.feedback_id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-white/70">{f.users?.full_name}</p>
                          <p className="text-[10px] text-white/30">{fmt.date(f.created_at)}</p>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{f.body}</p>
                      </div>
                    ))}
                    {publicFeedback.length > 2 && (
                      <p className="text-xs text-white/30 text-center">+{publicFeedback.length - 2} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
