import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import BulkLinkClient from './BulkLinkClient';

export default async function BulkLinkPage() {
  await requireAuth(['admin']);
  const supabase = await createClient();

  const [sponsorsRes, learnersRes, existingLinksRes] = await Promise.all([
    supabase.from('sponsors').select('sponsor_id, sponsor_name').eq('is_active', true).order('sponsor_name'),
    supabase.from('learners').select(`
      learner_id, learner_code, grade,
      learner_profiles(first_name, last_name),
      schools(school_name)
    `).eq('programme_status', 'active').order('learner_code'),
    supabase.from('sponsor_learners').select('sponsor_id, learner_id'),
  ]);

  const sponsors = sponsorsRes.data || [];
  const learners = (learnersRes.data || []).map((l: any) => ({
    learner_id:   l.learner_id,
    learner_code: l.learner_code,
    grade:        l.grade,
    full_name:    `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
    school_name:  l.schools?.school_name ?? '—',
  }));

  // existing links: learner_id -> sponsor_ids[]
  const existingLinks: Record<string, string[]> = {};
  (existingLinksRes.data || []).forEach((lnk: any) => {
    if (!existingLinks[lnk.learner_id]) existingLinks[lnk.learner_id] = [];
    existingLinks[lnk.learner_id].push(lnk.sponsor_id);
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Link — Learners to Sponsors</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Assign a sponsor to each learner. Changes save instantly.
        </p>
      </div>
      <BulkLinkClient sponsors={sponsors} learners={learners} existingLinks={existingLinks} />
    </div>
  );
}
