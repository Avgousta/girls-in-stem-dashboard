import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Users } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import LearnerAccessClient from './LearnerAccessClient';
import { headers } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://girls-stem-dashboard.vercel.app';

async function getLearners() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('learners')
    .select(`
      learner_id, learner_code, grade, user_id,
      learner_profiles(first_name, last_name),
      schools(school_name)
    `)
    .order('learner_code');

  return (data || []).map((l: any) => ({
    learner_id:   l.learner_id,
    learner_code: l.learner_code,
    full_name:    `${l.learner_profiles?.first_name || ''} ${l.learner_profiles?.last_name || ''}`.trim() || l.learner_code,
    grade:        l.grade || 0,
    school:       l.schools?.school_name || '—',
    registered:   !!l.user_id,
    reg_url:      `${BASE_URL}/register?code=${l.learner_code}`,
  }));
}

export default async function LearnerAccessPage() {
  await requireAuth(['admin']);
  const learners = await getLearners();

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
            <Users className="w-6 h-6" style={{ color: DS.primary }} /> Learner Access
          </h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
            Share registration links with learners so they can create their accounts.
            Each link pre-fills their learner code automatically.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl p-4 flex items-start gap-4"
        style={{ background: DS.primaryLight, border: `1px solid ${DS.primaryBorder}` }}>
        <div className="text-2xl shrink-0">💡</div>
        <div className="space-y-1 text-sm" style={{ color: DS.primary }}>
          <p className="font-bold">How to get learners registered</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs" style={{ color: DS.primary }}>
            <li>Click <strong>Print Sheet</strong> to get a printable list of all learners and their registration links</li>
            <li>Hand the sheet out at school — each learner has their own unique link</li>
            <li>Learner opens the link on their phone/computer, enters their email + password</li>
            <li>Their learner code is pre-filled automatically — they just create a password</li>
            <li>After registering they go to <strong>{BASE_URL}/login</strong> to sign in</li>
          </ol>
        </div>
      </div>

      <LearnerAccessClient learners={learners} baseUrl={BASE_URL} />
    </div>
  );
}
