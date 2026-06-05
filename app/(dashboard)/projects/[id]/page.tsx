import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { fmt } from '@/utils';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import ProjectActions from './ProjectActions';
import FeedbackThread from './FeedbackThread';
import { DS } from '@/components/platform/tokens';

interface Props { params: Promise<{ id: string }> }

const STAGES = [
  { key: 'planning',    label: 'Planning',    color: '#6B7280', bg: '#F9FAFB' },
  { key: 'in_progress', label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
  { key: 'review',      label: 'Under Review',color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'submitted',   label: 'Submitted',   color: '#2563EB', bg: '#EFF6FF' },
  { key: 'marked',      label: 'Marked ✅',   color: '#16A34A', bg: '#F0FDF4' },
] as const;

const scoreColor = (pct: number) => pct >= 75 ? 'var(--ds-success)' : pct >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)';
const scoreBg    = (pct: number) => pct >= 75 ? 'var(--ds-success)' : pct >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)';

export default async function ProjectDetailPage({ params }: Props) {
  const user = await requireAuth(['admin', 'instructor']);
  const { id } = await params;
  const supabase = await createClient();

  const [projRes, feedbackRes] = await Promise.all([
    supabase.from('projects').select(`
      *, learners(learner_id, learner_code, grade,
        learner_profiles(first_name, last_name, email),
        schools(school_name)),
      programs(program_name, program_type),
      users!reviewed_by(full_name)
    `).eq('project_id', id).single(),

    supabase.from('project_feedback').select(`
      feedback_id, body, is_private, created_at,
      users!author_id(full_name, role)
    `).eq('project_id', id).order('created_at'),
  ]);

  const p = projRes.data;
  if (!p) notFound();

  const learner  = (p as any).learners;
  const profile  = learner?.learner_profiles;
  const stage    = STAGES.find(s => s.key === ((p as any).stage || 'planning')) || STAGES[0];
  const pct      = (p as any).score != null ? Math.round(((p as any).score / ((p as any).max_score || 100)) * 100) : null;
  const feedback = ((feedbackRes.data || []) as any[])
    .filter((f: any) => !f.is_private || user.role === 'admin' || user.role === 'instructor')
    .map((f: any) => ({ ...f, users: Array.isArray(f.users) ? f.users[0] ?? {} : f.users ?? {} }));
  const overdue  = (p as any).due_date && new Date((p as any).due_date) < new Date() && !['submitted','marked'].includes((p as any).stage);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/projects"
          className="inline-flex items-center gap-1.5 text-sm hover:underline mb-4"
          style={{ color: DS.textMuted }}>
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: DS.text }}>{(p as any).project_name}</h1>
            <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
              {profile?.first_name} {profile?.last_name} · {(p as any).programs?.program_name}
            </p>
          </div>
          <span className="text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ background: `${stage.color}20`, color: stage.color }}>
            {stage.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Project details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Info card */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            {(p as any).description && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>Description</h3>
                <p className="text-sm" style={{ color: DS.textMid }}>{(p as any).description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs mb-0.5" style={{ color: DS.textMuted }}>Learner</p>
                <Link href={`/learners/${learner?.learner_id}`}
                  className="font-medium hover:underline" style={{ color: DS.primary }}>
                  {profile?.first_name} {profile?.last_name}
                </Link>
                <p className="text-xs" style={{ color: DS.textMuted }}>Gr {learner?.grade} · {learner?.schools?.school_name}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: DS.textMuted }}>Programme</p>
                <p className="font-medium" style={{ color: DS.text }}>{(p as any).programs?.program_name}</p>
                <p className="text-xs" style={{ color: DS.textMuted }}>{(p as any).programs?.program_type}</p>
              </div>
              {(p as any).due_date && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: DS.textMuted }}>Due Date</p>
                  <p className="font-medium flex items-center gap-1"
                    style={{ color: overdue ? 'var(--ds-danger)' : DS.text as string }}>
                    <Calendar className="w-3.5 h-3.5" />{fmt.date((p as any).due_date)}
                    {overdue && <span className="text-xs">⚠ Overdue</span>}
                  </p>
                </div>
              )}
              {(p as any).submitted_at && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: DS.textMuted }}>Submitted</p>
                  <p className="font-medium" style={{ color: DS.text }}>{fmt.date((p as any).submitted_at)}</p>
                </div>
              )}
            </div>

            {pct !== null && (
              <div className="pt-3" style={{ borderTop: `1px solid ${DS.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: DS.textMuted }}>Score</span>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(pct) }}>{pct}%</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: scoreBg(pct) }} />
                </div>
                <p className="text-xs mt-1 text-right" style={{ color: DS.textMuted }}>
                  {(p as any).score} / {(p as any).max_score} marks
                </p>
              </div>
            )}
          </div>

          {/* Stage pipeline */}
          <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: DS.textMuted }}>Project Pipeline</h3>
            <div className="flex items-center gap-1 flex-wrap">
              {STAGES.map((s, i) => {
                const isActive  = s.key === (p as any).stage;
                const isPassed  = STAGES.findIndex(st => st.key === (p as any).stage) > i;
                return (
                  <div key={s.key} className="flex items-center gap-1">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isActive ? 'scale-105' : ''}`}
                      style={{
                        background: isActive ? s.color : isPassed ? `${s.color}20` : DS.surfaceHover as string,
                        color:      isActive ? '#fff'   : isPassed ? s.color       : DS.textMuted as string,
                        boxShadow:  isActive ? `0 2px 8px ${s.color}60` : 'none',
                      }}>
                      {s.label}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className="w-4 h-0.5 rounded"
                        style={{ background: isPassed ? s.color : DS.borderLight }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <FeedbackThread
            projectId={id}
            feedback={feedback}
            currentUserId={user.user_id}
            currentUserName={user.full_name}
            isAdmin={user.role === 'admin' || user.role === 'instructor'}
          />
        </div>

        {/* Right: Actions panel */}
        <div>
          <ProjectActions
            project={{
              id,
              stage:     (p as any).stage || 'planning',
              score:     (p as any).score,
              max_score: (p as any).max_score,
              due_date:  (p as any).due_date,
            }}
            stages={STAGES}
            isAdmin={user.role === 'admin' || user.role === 'instructor'}
          />
        </div>
      </div>
    </div>
  );
}
