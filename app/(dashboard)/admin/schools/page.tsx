import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import SchoolsClient from './SchoolsClient';

async function getSchools() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('schools')
    .select('*, learners(count)')
    .order('school_name');
  return (data || []).map((s) => ({
    school_id:      s.school_id,
    school_name:    s.school_name,
    district:       s.district,
    province:       s.province,
    contact_person: s.contact_person || '—',
    contact_email:  s.contact_email  || null,
    is_active:      s.is_active,
    learner_count:  Array.isArray(s.learners) ? s.learners.length : 0,
  }));
}

export default async function AdminSchoolsPage() {
  await requireAuth(['admin']);
  const schools = await getSchools();
  return (
    <div className="max-w-6xl space-y-6">
      <SchoolsClient schools={schools} />
    </div>
  );
}
