import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { fmt } from '@/utils';
import Link from 'next/link';
import { ArrowLeft, Calendar, Award, MessageSquare, User } from 'lucide-react';
import ProjectActions from './ProjectActions';
import FeedbackThread from './FeedbackThread';

interface Props { params: Promise<{ id: string }> }

const STAGES = [
  { key: 'planning',    label: 'Planning',    color: '#6B7280', bg: '#F9FAFB' },
  { key: 'in_progress', label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
  { key: 'review',      label: 'Under Review',color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'submitted',   label: 'Submitted',   color: '#2563EB', bg: '#EFF6FF' },
  { key: 'marked',      label: 'Marked ✅',   color: '#16A34A', bg: '#F0FDF4' },
] as const;

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
  const feedback = (feedbackRes.data || []).filter((f: any) => !f.is_private || user.role === 'admin' || user.role === 'instructor');

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{(p as any).project_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {profile?.first_name} {profile?.last_name} · {(p as any).programs?.program_name}
            </p>
          </div>
          <span className="text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ background: stage.bg, color: stage.color }}>
            {stage.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Project details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Info card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {(p as any).description && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h3>
                <p className="text-sm text-gray-700">{(p as any).description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Learner</p>
                <Link href={`/learners/${learner?.learner_id}`}
                  className="font-medium text-brand-700 hover:underline">
                  {profile?.first_name} {profile?.last_name}
                </Link>
                <p className="text-xs text-gray-400">Gr {learner?.grade} · {learner?.schools?.school_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Programme</p>
                <p className="font-medium text-gray-800">{(p as any).programs?.program_name}</p>
                <p className="text-xs text-gray-400">{(p as any).programs?.program_type}</p>
              </div>
              {(p as any).due_date && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Due Date</p>
                  <p className={`font-medium flex items-center gap-1 ${new Date((p as any).due_date) < new Date() && !['submitted','marked'].includes((p as any).stage) ? 'text-red-600' : 'text-gray-800'}`}>
                    <Calendar className="w-3.5 h-3.5" />{fmt.date((p as any).due_date)}
                    {new Date((p as any).due_date) < new Date() && !['submitted','marked'].includes((p as any).stage) && (
                      <span className="text-xs">⚠ Overdue</span>
                    )}
                  </p>
                </div>
              )}
              {(p as any).submitted_at && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Submitted</p>
                  <p className="font-medium text-gray-800">{fmt.date((p as any).submitted_at)}</p>
                </div>
              )}
            </div>

            {/* Score */}
            {(p as any).score != null && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Score</span>
                  <span className={`text-2xl font-bold tabular-nums ${pct! >= 75 ? 'text-mint-600' : pct! >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct! >= 75 ? '#2DD4A0' : pct! >= 50 ? '#FCD34D' : '#F87171',
                    }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {(p as any).score} / {(p as any).max_score} marks
                </p>
              </div>
            )}
          </div>

          {/* Stage pipeline visual */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Project Pipeline</h3>
            <div className="flex items-center gap-1 flex-wrap">
              {STAGES.map((s, i) => {
                const isActive  = s.key === (p as any).stage;
                const isPassed  = STAGES.findIndex(st => st.key === (p as any).stage) > i;
                return (
                  <div key={s.key} className="flex items-center gap-1">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive ? 'shadow-md scale-105' : ''
                    }`}
                      style={{
                        background: isActive ? s.color : isPassed ? s.color + '20' : '#F3F4F6',
                        color:      isActive ? '#fff'   : isPassed ? s.color       : '#9CA3AF',
                      }}>
                      {s.label}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className="w-4 h-0.5 rounded" style={{
                        background: isPassed ? s.color : '#E5E7EB',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback thread */}
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
