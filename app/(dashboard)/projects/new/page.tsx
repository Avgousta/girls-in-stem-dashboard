import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewProjectForm from './NewProjectForm';
import Link from 'next/link';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

export default async function NewProjectPage() {
  await requireAuth(['admin', 'instructor']);
  const supabase = await createClient();

  const [learnersRes, programsRes] = await Promise.all([
    supabase
      .from('learners')
      .select('learner_id, learner_code, learner_profiles(first_name, last_name), schools(school_name)')
      .eq('programme_status', 'active')
      .order('learner_code'),
    supabase
      .from('programs')
      .select('program_id, program_name, program_type')
      .eq('is_active', true)
      .order('program_name'),
  ]);

  interface LRow { learner_id: string; learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null }
  const learners = ((learnersRes.data || []) as unknown as LRow[]).map(l => ({
    learner_id:   l.learner_id,
    learner_code: l.learner_code,
    full_name:    `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
    school_name:  l.schools?.school_name ?? '—',
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/projects"
          className="inline-flex items-center gap-1.5 text-sm hover:underline mb-4"
          style={{ color: DS.textMuted }}>
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <FolderKanban className="w-6 h-6" style={{ color: DS.primary }} /> Add Project
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>Assign a project to a learner</p>
      </div>
      <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <NewProjectForm learners={learners} programs={programsRes.data || []} />
      </div>
    </div>
  );
}
