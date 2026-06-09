import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ProfileEditor from './ProfileEditor';
import ThemePicker from './ThemePicker';

export default async function StudentProfilePage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: rawLearner } = await supabase
    .from('learners')
    .select('learner_id, learner_code, grade, learner_profiles(*), schools(school_name)')
    .eq('user_id', user.user_id)
    .single();

  interface ProfileLearner { learner_id: string; learner_code: string; grade: number; learner_profiles: Record<string, unknown>; schools: { school_name: string } | null }
  const learner = rawLearner as unknown as ProfileLearner | null;
  const profile = learner?.learner_profiles || {};

  return (
    <div className="space-y-5 pt-2 pb-4">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--t-text,#fff)' }}>
          My Profile ✨
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t-muted,rgba(255,255,255,0.4))' }}>
          Personalise your portal — make it yours
        </p>
      </div>
      <ThemePicker />
      <ProfileEditor
        learnerId={learner?.learner_id ?? ''}
        learnerCode={learner?.learner_code ?? ''}
        grade={learner?.grade ?? 0}
        schoolName={learner?.schools?.school_name ?? ''}
        profile={profile}
      />
    </div>
  );
}
