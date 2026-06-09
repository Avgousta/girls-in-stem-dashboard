import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewMentorshipForm from './NewMentorshipForm';
import Link from 'next/link';
import { ArrowLeft, HeartHandshake } from 'lucide-react';

interface Props { searchParams: Promise<{ learner?: string }> }

async function getPageData(learnerId?: string) {
  const supabase = await createClient();
  const [learnersRes, mentorsRes] = await Promise.all([
    supabase.from('learners')
      .select('learner_id, learner_profiles(first_name, last_name)')
      .eq('programme_status', 'active'),
    supabase.from('users')
      .select('user_id, full_name')
      .in('role', ['instructor', 'admin'])
      .order('full_name'),
  ]);

  let preselected = null;
  if (learnerId) {
    const { data } = await supabase
      .from('learners')
      .select('learner_id, learner_profiles(first_name, last_name)')
      .eq('learner_id', learnerId)
      .single();
    preselected = data;
  }

  return {
    learners: ((learnersRes.data || []) as unknown as Array<{ learner_id: string; learner_profiles: { first_name: string; last_name: string } | null }>).map(l => ({
      learner_id: l.learner_id,
      full_name: `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
    })),
    mentors:  mentorsRes.data || [],
    preselected,
  };
}

export default async function NewMentorshipPage({ searchParams }: Props) {
  const user = await requireAuth(['admin', 'instructor']);
  const { learner } = await searchParams;
  const { learners, mentors, preselected } = await getPageData(learner);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link
          href={preselected ? `/learners/${learner}` : '/mentorship'}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-brand-700" /> Log Mentorship Session
        </h1>
        {preselected && (
          <p className="text-sm text-gray-500 mt-0.5">
            For <strong>{(preselected as unknown as { learner_profiles: { first_name: string; last_name: string } | null }).learner_profiles?.first_name} {(preselected as unknown as { learner_profiles: { first_name: string; last_name: string } | null }).learner_profiles?.last_name}</strong>
          </p>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <NewMentorshipForm
          learners={learners}
          mentors={mentors}
          preselectedId={learner}
          currentUserId={user.user_id} />
      </div>
    </div>
  );
}
