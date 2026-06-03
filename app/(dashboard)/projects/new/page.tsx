import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewProjectForm from './NewProjectForm';
import Link from 'next/link';
import { ArrowLeft, FolderKanban } from 'lucide-react';

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

  const learners = (learnersRes.data || []).map((l: any) => ({
    learner_id:   l.learner_id,
    learner_code: l.learner_code,
    full_name:    `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
    school_name:  l.schools?.school_name ?? '—',
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FolderKanban className="w-6 h-6 text-brand-700" /> Add Project
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Assign a project to a learner</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <NewProjectForm learners={learners} programs={programsRes.data || []} />
      </div>
    </div>
  );
}
