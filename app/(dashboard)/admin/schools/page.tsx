import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/Badge';
import { School } from 'lucide-react';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

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

const thSt: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
};

export default async function AdminSchoolsPage() {
  await requireAuth(['admin']);
  const schools = await getSchools();

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <School className="w-6 h-6" style={{ color: DS.primary }} /> Schools
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>{schools.length} registered schools</p>
      </div>

      {schools.length === 0 ? (
        <div className="text-center py-16 rounded-2xl text-sm" style={{ background: DS.surface, border: `1px solid ${DS.border}`, color: DS.textMuted }}>
          No schools found. Add schools via the SQL seed or Admin panel.
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['School','District','Province','Contact','Email','Learners','Status'].map(h => (
                  <th key={h} style={thSt}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.school_id} className="tr-hover"
                  style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                  <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>{s.school_name}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMid }}>{s.district}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMid }}>{s.province}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMuted }}>{s.contact_person}</td>
                  <td className="px-4 py-3">
                    {s.contact_email
                      ? <a href={`mailto:${s.contact_email}`}
                          className="text-xs hover:underline" style={{ color: DS.primary }}>
                          {s.contact_email}
                        </a>
                      : <span style={{ color: DS.borderLight }}>—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: DS.primary }}>{s.learner_count}</td>
                  <td className="px-4 py-3"><StatusBadge label={s.is_active ? 'active' : 'inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
