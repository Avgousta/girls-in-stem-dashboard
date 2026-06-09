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
          className="inline-flex items-center gap-1.5 text-sm mb-4 hover:underline"
          style={{ color: 'var(--ds-text-mid)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>
          <AlertTriangle className="w-6 h-6" style={{ color: 'var(--ds-warn)' }} />
          Log Intervention
        </h1>
        {preselected && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-mid)' }}>
            For <strong>{(preselected as unknown as { learner_profiles: { first_name: string; last_name: string } | null }).learner_profiles?.first_name} {(preselected as unknown as { learner_profiles: { first_name: string; last_name: string } | null }).learner_profiles?.last_name}</strong>
          </p>
        )}
      </div>
      <div className="rounded-2xl p-6" style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)' }}>
        <NewInterventionForm
          learners={((learnersRes.data || []) as unknown as Array<{ learner_id: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null }>).map(l => ({
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
