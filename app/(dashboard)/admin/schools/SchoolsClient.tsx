'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { Plus, Pencil, X, Check, Loader2, School } from 'lucide-react';

interface SchoolRow {
  school_id: string;
  school_name: string;
  district: string;
  province: string;
  contact_person: string;
  contact_email: string | null;
  is_active: boolean;
  learner_count: number;
}

const PROVINCES = [
  'Eastern Cape','Free State','Gauteng','KwaZulu-Natal',
  'Limpopo','Mpumalanga','North West','Northern Cape','Western Cape',
];

const inputSt: React.CSSProperties = {
  width: '100%', background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: 10,
  padding: '8px 12px', fontSize: 13, outline: 'none',
};
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 5, color: DS.textMuted as string,
};
const thSt: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
};

interface FormState {
  school_name: string; district: string; province: string;
  contact_person: string; contact_email: string; contact_phone: string;
}
const emptyForm = (): FormState => ({
  school_name: '', district: '', province: 'Gauteng',
  contact_person: '', contact_email: '', contact_phone: '',
});

export default function SchoolsClient({ schools: initial }: { schools: SchoolRow[] }) {
  const [schools, setSchools] = useState(initial);
  const [modal,   setModal]   = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<SchoolRow | null>(null);
  const [form,    setForm]    = useState<FormState>(emptyForm());
  const [saving,  setSaving]  = useState(false);

  const openCreate = () => { setForm(emptyForm()); setEditing(null); setModal('create'); };
  const openEdit   = (s: SchoolRow) => {
    setForm({
      school_name:    s.school_name,
      district:       s.district,
      province:       s.province,
      contact_person: s.contact_person === '—' ? '' : s.contact_person,
      contact_email:  s.contact_email ?? '',
      contact_phone:  '',
    });
    setEditing(s); setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.school_name.trim() || !form.district.trim()) {
      toast.error('School name and district are required'); return;
    }
    setSaving(true);
    try {
      const payload = {
        school_name:    form.school_name.trim(),
        district:       form.district.trim(),
        province:       form.province,
        contact_person: form.contact_person.trim() || undefined,
        contact_email:  form.contact_email.trim()  || undefined,
        contact_phone:  form.contact_phone.trim()  || undefined,
      };

      if (modal === 'create') {
        const res  = await fetch('/api/v1/schools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setSchools(prev => [...prev, { ...json.data, learner_count: 0 }]);
        toast.success('School created');
      } else if (editing) {
        const res  = await fetch(`/api/v1/schools/${editing.school_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setSchools(prev => prev.map(s => s.school_id === editing!.school_id
          ? { ...s,
              school_name:    payload.school_name    ?? s.school_name,
              district:       payload.district       ?? s.district,
              province:       payload.province       ?? s.province,
              contact_person: payload.contact_person ?? s.contact_person,
              contact_email:  payload.contact_email  ?? s.contact_email,
            } as SchoolRow
          : s));
        toast.success('School updated');
      }
      closeModal();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
            <School className="w-6 h-6" style={{ color: DS.primary }} /> Schools
          </h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>{schools.length} registered schools</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" /> Add School
        </button>
      </div>

      {/* Table */}
      {schools.length === 0 ? (
        <div className="text-center py-16 rounded-2xl text-sm"
          style={{ background: DS.surface, border: `1px solid ${DS.border}`, color: DS.textMuted }}>
          No schools found. Click &ldquo;Add School&rdquo; to create one.
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['School','District','Province','Contact','Email','Learners','Status',''].map(h => (
                  <th key={h} style={thSt}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.school_id} style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                  <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>{s.school_name}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMid }}>{s.district}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMid }}>{s.province}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMuted }}>{s.contact_person}</td>
                  <td className="px-4 py-3">
                    {s.contact_email
                      ? <a href={`mailto:${s.contact_email}`} className="text-xs hover:underline" style={{ color: DS.primary }}>{s.contact_email}</a>
                      : <span style={{ color: DS.borderLight }}>—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: DS.primary }}>{s.learner_count}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={s.is_active
                        ? { background: 'var(--ds-success-light)', color: 'var(--ds-success)' }
                        : { background: DS.surfaceHover, color: DS.textMuted as string }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(s)} title="Edit school"
                      className="p-1.5 rounded-lg cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
                      style={{ background: DS.surfaceHover }}>
                      <Pencil className="w-3.5 h-3.5" style={{ color: DS.textMid }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5"
            style={{ background: DS.surface, border: `1px solid ${DS.primaryBorder}` }}>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: DS.text }}>
                {modal === 'create' ? 'Add School' : `Edit — ${editing?.school_name}`}
              </h2>
              <button onClick={closeModal} className="cursor-pointer" style={{ color: DS.textMuted }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label style={labelSt}>School Name <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
                <input value={form.school_name} onChange={set('school_name')} placeholder="e.g. UJ Academy SOS School" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>District <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
                <input value={form.district} onChange={set('district')} placeholder="e.g. Johannesburg Central" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Province</label>
                <select value={form.province} onChange={set('province')} style={{ ...inputSt, colorScheme: 'dark' }}>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Contact Person</label>
                <input value={form.contact_person} onChange={set('contact_person')} placeholder="Full name" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Contact Email</label>
                <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="name@school.co.za" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Contact Phone</label>
                <input value={form.contact_phone} onChange={set('contact_phone')} placeholder="011 000 0000" style={inputSt} />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} className="btn-secondary cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {modal === 'create' ? 'Create School' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
