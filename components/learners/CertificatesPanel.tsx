'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { Loader2, Plus, ExternalLink, ShieldCheck } from 'lucide-react';
import { fmt } from '@/utils';

interface Cert { certificate_id: string; cert_type: string; issued_at: string; verification_code: string; programs: { program_name: string } | null }
interface Programme { program_id: string; program_name: string }

interface Props {
  learnerId:    string;
  certificates: Cert[];
  programmes:   Programme[];
}

const CERT_TYPES = [
  { value: 'completion',    label: 'Completion' },
  { value: 'achievement',   label: 'Achievement' },
  { value: 'participation', label: 'Participation' },
] as const;

const CERT_COLORS: Record<string, string> = {
  completion:    '#1D4ED8',
  achievement:   '#7C3AED',
  participation: '#059669',
};

export default function CertificatesPanel({ learnerId, certificates: initial, programmes }: Props) {
  const [certs,   setCerts]   = useState(initial);
  const [issuing, setIssuing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    cert_type:    'completion' as string,
    programme_id: programmes[0]?.program_id ?? '',
    issued_at:    new Date().toISOString().slice(0, 10),
    notes:        '',
  });

  const issue = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id:   learnerId,
          cert_type:    form.cert_type,
          programme_id: form.programme_id || null,
          issued_at:    form.issued_at,
          notes:        form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCerts(prev => [json.data, ...prev]);
      setIssuing(false);
      toast.success('Certificate issued');
    } catch {
      toast.error('Could not issue certificate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Issue form */}
      {issuing ? (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: DS.surfaceHover, border: `1px solid ${DS.primaryBorder}` }}>
          <p className="text-xs font-bold" style={{ color: DS.text }}>Issue New Certificate</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Type</label>
              <select value={form.cert_type} onChange={e => setForm(f => ({ ...f, cert_type: e.target.value }))}
                className="form-select w-full text-sm">
                {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Programme</label>
              <select value={form.programme_id} onChange={e => setForm(f => ({ ...f, programme_id: e.target.value }))}
                className="form-select w-full text-sm">
                <option value="">None</option>
                {programmes.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Date Issued</label>
            <input type="date" value={form.issued_at}
              onChange={e => setForm(f => ({ ...f, issued_at: e.target.value }))}
              className="form-input text-sm" />
          </div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional note to appear on the certificate…"
            rows={2} className="form-input w-full text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setIssuing(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: DS.surface, color: DS.textMid }}>
              Cancel
            </button>
            <button onClick={issue} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
              style={{ background: DS.primary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Issuing…</> : 'Issue Certificate'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIssuing(true)}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all"
          style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
          <Plus className="w-3.5 h-3.5" /> Issue Certificate
        </button>
      )}

      {/* Certificate list */}
      {certs.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: DS.textMuted }}>No certificates issued yet.</p>
      ) : (
        <div className="space-y-2">
          {certs.map(c => {
            const color = CERT_COLORS[c.cert_type] ?? DS.primary;
            return (
              <div key={c.certificate_id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: DS.surfaceHover }}>
                <ShieldCheck className="w-5 h-5 shrink-0" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold capitalize" style={{ color }}>
                    Certificate of {c.cert_type}
                  </p>
                  <p className="text-xs" style={{ color: DS.textMuted }}>
                    {c.programs?.program_name ?? 'Girls in STEM'} · {fmt.date(c.issued_at)}
                    {' · '}<span style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{c.verification_code}</span>
                  </p>
                </div>
                <a href={`/api/v1/reports/certificate/${c.certificate_id}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer"
                  style={{ color: DS.primary }}>
                  <ExternalLink className="w-3.5 h-3.5" /> View
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
