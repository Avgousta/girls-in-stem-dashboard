import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewInterventionForm from './NewInterventionForm';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

interface Props { searchParams: Promise<{ learner?: string }> }

export default async function NewInterventionPage({ searchParams }: Props) {
  const user      = await requireAuth(['admin', 'instructor']);
  const { learner } = await searchParams;
  const supabase  = await createClient();

  const [learnersRes, instructorsRes, preRes] = await Promise.all([
    supabase.from('learners')
      .select('learner_id, learner_profiles(first_name, last_name), schools(school_name)')
      .eq('programme_status', 'active').order('learner_id'),
    supabase.from('users').select('user_id, full_name').in('role', ['admin','instructor']).order('full_name'),
    learner ? supabase.from('learners')
      .select('learner_id, learner_profiles(first_name, last_name)')
      .eq('learner_id', learner).single() : Promise.resolve({ data: null }),
  ]);

  const preselected = preRes.data;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={preselected ? `/learners/${learner}` : '/interventions'}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" /> Log Intervention
        </h1>
        {preselected && (
          <p className="text-sm text-gray-500 mt-0.5">
            For <strong>{(preselected as any).learner_profiles?.first_name} {(preselected as any).learner_profiles?.last_name}</strong>
          </p>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <NewInterventionForm
          learners={(learnersRes.data || []).map((l: any) => ({
            learner_id: l.learner_id,
            full_name: `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
            school:    l.schools?.school_name ?? '',
          }))}
          instructors={instructorsRes.data || []}
          preselectedId={learner}
          currentUserId={user.user_id}
        />
      </div>
    </div>
  );
}
