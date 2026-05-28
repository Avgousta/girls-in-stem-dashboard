import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import DataTable from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { School } from 'lucide-react';

async function getSchools() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('schools')
    .select('*, learners(count)')
    .order('school_name');
  return (data || []).map((s: any) => ({
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

  const headers = [
    { key: 'name',     header: 'School' },
    { key: 'district', header: 'District' },
    { key: 'province', header: 'Province' },
    { key: 'contact',  header: 'Contact' },
    { key: 'email',    header: 'Email' },
    { key: 'learners', header: 'Learners' },
    { key: 'status',   header: 'Status' },
  ];

  // Build rows as flat arrays — no nested arrays of JSX that need keys
  const rows: React.ReactNode[][] = schools.map(s => [
    <span key="name"    className="font-medium text-gray-900">{s.school_name}</span>,
    <span key="dist"    >{s.district}</span>,
    <span key="prov"    >{s.province}</span>,
    <span key="contact" className="text-gray-600">{s.contact_person}</span>,
    s.contact_email
      ? <a key="email" href={`mailto:${s.contact_email}`} className="text-brand-700 text-xs hover:underline">{s.contact_email}</a>
      : <span key="email" className="text-gray-300">—</span>,
    <span key="count"   className="font-mono font-semibold text-brand-700">{s.learner_count}</span>,
    <StatusBadge key="status" label={s.is_active ? 'active' : 'inactive'} />,
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <School className="w-6 h-6 text-brand-700" /> Schools
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{schools.length} registered schools</p>
      </div>
      <DataTable
        headers={headers}
        rows={rows}
        rowKeys={schools.map(s => s.school_id)}
        pageSize={20}
        emptyMessage="No schools found. Add schools via the SQL seed or Admin panel." />
    </div>
  );
}
