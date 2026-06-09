'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface Program { program_id: string; program_name: string }

const TYPES = [
  ['general',          '🔔 General'],
  ['intervention',     '⚠️ Intervention'],
  ['assessment',       '📝 Assessment'],
  ['mentorship',       '💬 Mentorship'],
  ['absence',          '🚫 Absence Alert'],
  ['low_score',        '📉 Low Score Alert'],
  ['risk',             '🔴 Risk Alert'],
  ['meeting',          '📅 Meeting'],
  ['project_feedback', '💡 Project Feedback'],
] as const;

const ROLES = [
  ['learner',    '👩‍🎓 All Learners'],
  ['instructor', '👩‍🏫 All Instructors'],
  ['parent',     '👨‍👩‍👧 All Parents'],
] as const;

const inputSt: React.CSSProperties = {
  width: '100%', background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '8px 12px', fontSize: '13px', outline: 'none',
};
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '5px', color: DS.textMuted as string,
};

export default function SendNotificationForm({ programs }: { programs: Program[] }) {
  const [open,      setOpen]      = useState(false);
  const [title,     setTitle]     = useState('');
  const [body,      setBody]      = useState('');
  const [type,      setType]      = useState('general');
  const [target,    setTarget]    = useState<'program' | 'role'>('program');
  const [programId, setProgramId] = useState('');
  const [role,      setRole]      = useState('learner');
  const [loading,   setLoading]   = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Title and message are required'); return; }
    if (target === 'program' && !programId) { toast.error('Select a programme'); return; }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = { title, body, type };
      if (target === 'program') payload.program_id = programId;
      else payload.role = role;

      const res = await fetch('/api/v1/notifications/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Notification sent to ${json.data?.recipients ?? 0} recipient(s)`);
      setTitle(''); setBody(''); setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: DS.surface, border: `1px solid ${DS.primaryBorder}` }}>

      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer"
        style={{ borderBottom: open ? `1px solid ${DS.border}` : 'none' }}>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4" style={{ color: DS.primary }} />
          <span className="text-sm font-bold" style={{ color: DS.text }}>Send Notification</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: DS.primaryLight, color: DS.primary }}>Admin</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: DS.textMuted }} />
          : <ChevronDown className="w-4 h-4" style={{ color: DS.textMuted }} />}
      </button>

      {open && (
        <div className="p-5 space-y-4">

          {/* Target toggle */}
          <div>
            <label style={labelSt}>Send To</label>
            <div className="flex gap-1 p-1 rounded-xl w-fit"
              style={{ background: DS.surfaceHover }}>
              {(['program', 'role'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTarget(t)}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                  style={target === t
                    ? { background: DS.primary, color: '#fff' }
                    : { background: 'transparent', color: DS.textMid as string }}>
                  {t === 'program' ? '📋 Programme' : '👥 Role'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target selector */}
            <div>
              <label style={labelSt}>{target === 'program' ? 'Programme' : 'Role'}</label>
              {target === 'program' ? (
                <select value={programId} onChange={e => setProgramId(e.target.value)}
                  style={{ ...inputSt, colorScheme: 'dark' }}>
                  <option value="">Select programme…</option>
                  {programs.map(p => (
                    <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
                  ))}
                </select>
              ) : (
                <select value={role} onChange={e => setRole(e.target.value)}
                  style={{ ...inputSt, colorScheme: 'dark' }}>
                  {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
            </div>

            {/* Type */}
            <div>
              <label style={labelSt}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                style={{ ...inputSt, colorScheme: 'dark' }}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelSt}>Title <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Term 2 marks are now available"
              maxLength={120}
              style={inputSt}
            />
          </div>

          {/* Body */}
          <div>
            <label style={labelSt}>Message <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your message here…"
              rows={3}
              maxLength={500}
              style={{ ...inputSt, resize: 'vertical' }}
            />
            <p className="text-xs mt-1 text-right" style={{ color: DS.textMuted }}>
              {body.length}/500
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button onClick={() => setOpen(false)} type="button"
              className="text-sm cursor-pointer" style={{ color: DS.textMuted }}>
              Cancel
            </button>
            <button onClick={handleSend} disabled={loading || !title.trim() || !body.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 cursor-pointer">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Sending…' : 'Send Notification'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
