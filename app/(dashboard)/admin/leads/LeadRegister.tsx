'use client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Mail } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import {
  LEAD_PRIORITIES, LEAD_STATUSES, CONTEXT_QUESTIONS,
  interestLabel, nextStepLabel, type LeadRow, type LeadCategory,
} from '@/lib/connect';

const CATEGORY_COLOR: Record<string, string> = {
  MCX: '#1E7B34', Academy: '#0B5E86', NPO: '#C8102E', Multiple: '#7C3AED',
};
const PRIORITY_COLOR: Record<string, string> = {
  High: 'var(--ds-danger)', Medium: 'var(--ds-warn)', Low: 'var(--ds-success)',
};

type Editable = Pick<LeadRow, 'lead_category' | 'priority' | 'owner' | 'follow_up_date' | 'status' | 'internal_notes'>;

export default function LeadRegister({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ category: string; status: string; q: string }>({ category: '', status: '', q: '' });

  const shown = useMemo(() => leads.filter(l =>
    (!filter.category || l.lead_category === filter.category) &&
    (!filter.status || l.status === filter.status) &&
    (!filter.q || `${l.full_name} ${l.email} ${l.organisation ?? ''} ${l.country}`.toLowerCase().includes(filter.q.toLowerCase()))
  ), [leads, filter]);

  const counts = useMemo(() => ({
    total: leads.length,
    newCount: leads.filter(l => l.status === 'New').length,
    high: leads.filter(l => l.priority === 'High' && l.status !== 'Closed' && l.status !== 'Won').length,
    due: leads.filter(l => l.follow_up_date && l.follow_up_date <= new Date().toISOString().slice(0, 10) && l.status !== 'Closed' && l.status !== 'Won').length,
  }), [leads]);

  async function save(id: string, patch: Partial<Editable>) {
    const prev = leads;
    setLeads(ls => ls.map(l => l.lead_id === id ? { ...l, ...patch } : l));
    const res = await fetch(`/api/v1/connect/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setLeads(prev);
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? 'Could not save');
    }
  }

  const card = { background: DS.surface, border: `1px solid ${DS.border}` };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Total leads', counts.total],
          ['New / untouched', counts.newCount],
          ['Open high priority', counts.high],
          ['Follow-ups due', counts.due],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl p-4" style={card}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: DS.textMuted }}>{label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: DS.text }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="form-input max-w-xs" placeholder="Search name, email, organisation…"
          value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} />
        <select className="form-select w-auto" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {['MCX', 'Academy', 'NPO', 'Multiple'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-select w-auto" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-sm" style={{ ...card, color: DS.textMuted }}>
          {leads.length === 0 ? 'No leads yet. Submissions from the conference QR code will appear here.' : 'No leads match these filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={card}>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr style={{ color: DS.textMuted, borderBottom: `1px solid ${DS.border}` }}>
                {['', 'Submitted', 'Contact', 'Organisation', 'Category', 'Next step', 'Priority', 'Owner', 'Follow-up', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(l => {
                const isOpen = open === l.lead_id;
                return (
                  <FragmentRow key={l.lead_id}>
                    <tr style={{ borderBottom: `1px solid ${DS.border}`, color: DS.text }}>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setOpen(isOpen ? null : l.lead_id)} aria-label={isOpen ? 'Collapse lead' : 'Expand lead'} style={{ color: DS.textMuted }}>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5" style={{ color: DS.textMid }}>
                        {new Date(l.created_at).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold">{l.full_name}</p>
                        <a href={`mailto:${l.email}`} className="text-xs" style={{ color: DS.textMuted }}>{l.email}</a>
                      </td>
                      <td className="px-3 py-2.5">
                        <p>{l.organisation || '—'}</p>
                        <p className="text-xs" style={{ color: DS.textMuted }}>{[l.job_title, l.country].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <select className="form-select w-auto py-1 text-xs font-bold" value={l.lead_category}
                          style={{ color: CATEGORY_COLOR[l.lead_category] }}
                          onChange={e => save(l.lead_id, { lead_category: e.target.value })}>
                          {['MCX', 'Academy', 'NPO', 'Multiple'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5" style={{ color: DS.textMid }}>{nextStepLabel(l.next_step)}</td>
                      <td className="px-3 py-2.5">
                        <select className="form-select w-auto py-1 text-xs font-bold" value={l.priority}
                          style={{ color: PRIORITY_COLOR[l.priority] }}
                          onChange={e => save(l.lead_id, { priority: e.target.value })}>
                          {LEAD_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input className="form-input w-28 py-1 text-xs" defaultValue={l.owner ?? ''} placeholder="Assign…"
                          onBlur={e => e.target.value !== (l.owner ?? '') && save(l.lead_id, { owner: e.target.value || null })} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="date" className="form-input w-36 py-1 text-xs" value={l.follow_up_date ?? ''}
                          onChange={e => save(l.lead_id, { follow_up_date: e.target.value || null })} />
                      </td>
                      <td className="px-3 py-2.5">
                        <select className="form-select w-auto py-1 text-xs" value={l.status}
                          onChange={e => save(l.lead_id, { status: e.target.value })}>
                          {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                        <td />
                        <td colSpan={9} className="px-3 pb-5 pt-2">
                          <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-3 text-sm" style={{ color: DS.textMid }}>
                              <Detail label="Interests" value={l.interests.map(interestLabel).join(' · ')} />
                              {l.context_answer && (
                                <Detail label={CONTEXT_QUESTIONS[(l.lead_category as LeadCategory)] ?? 'Tell us more'} value={l.context_answer} />
                              )}
                              {l.message && <Detail label="Message" value={l.message} />}
                              <Detail label="Marketing opt-in" value={l.marketing_opt_in ? 'Yes' : 'No: enquiry follow-up only'} />
                              <Detail label="Source" value={l.source} />
                              <a href={`mailto:${l.email}?subject=${encodeURIComponent('Following up from SSOW Amsterdam: Melisizwe')}`}
                                className="btn-secondary inline-flex items-center gap-2 text-xs">
                                <Mail className="h-3.5 w-3.5" /> Email {l.full_name.split(' ')[0]}
                              </a>
                            </div>
                            <div>
                              <label className="form-label">Meeting / proposal notes</label>
                              <textarea className="form-input" rows={5} defaultValue={l.internal_notes ?? ''}
                                onBlur={e => e.target.value !== (l.internal_notes ?? '') && save(l.lead_id, { internal_notes: e.target.value || null })} />
                              <p className="mt-1 text-xs" style={{ color: DS.textMuted }}>Saves when you click away.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: DS.textMuted }}>{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap" style={{ color: DS.text }}>{value}</p>
    </div>
  );
}
