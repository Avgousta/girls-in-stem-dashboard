'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { Loader2, Send, MessageSquare, AlertCircle, FileText, ChevronDown, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface Message {
  message_id:  string;
  message_type: string;
  subject:     string;
  body:        string;
  absence_date: string | null;
  status:      string;
  reply_body:  string | null;
  replied_at:  string | null;
  created_at:  string;
}

interface Props {
  learnerId:    string;
  learnerName:  string;
  initialMessages: Message[];
  absentDates:  string[];  // ISO dates of absent sessions
}

const TYPE_CFG = {
  general: { label: 'General Message', icon: MessageSquare, color: DS.primary as string },
  excuse:  { label: 'Absence Excuse',  icon: FileText,      color: '#7C3AED' },
  concern: { label: 'Flag a Concern',  icon: AlertCircle,   color: 'var(--ds-warn)' },
} as const;

export default function ContactForm({ learnerId, learnerName, initialMessages, absentDates }: Props) {
  const [messages,  setMessages]  = useState(initialMessages);
  const [open,      setOpen]      = useState(false);
  const [type,      setType]      = useState<'general' | 'excuse' | 'concern'>('general');
  const [subject,   setSubject]   = useState('');
  const [body,      setBody]      = useState('');
  const [absDate,   setAbsDate]   = useState(absentDates[0] ?? '');
  const [saving,    setSaving]    = useState(false);
  const [histOpen,  setHistOpen]  = useState(false);

  const send = async () => {
    if (!subject.trim() || !body.trim()) { toast.error('Please fill in subject and message.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/parent/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id:   learnerId,
          message_type: type,
          subject:      type === 'excuse' ? `Absence excuse — ${absDate}` : subject,
          body,
          absence_date: type === 'excuse' ? absDate : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessages(prev => [{ ...json.data, message_type: type, subject: type === 'excuse' ? `Absence excuse — ${absDate}` : subject, body, absence_date: type === 'excuse' ? absDate : null, status: 'unread', reply_body: null, replied_at: null, created_at: new Date().toISOString() }, ...prev]);
      setOpen(false);
      setSubject(''); setBody('');
      toast.success('Message sent to the programme coordinator');
    } catch {
      toast.error('Could not send message');
    } finally {
      setSaving(false);
    }
  };

  const unread = messages.filter(m => m.status === 'replied').length;

  return (
    <div className="space-y-4">
      {/* Type selector */}
      {!open ? (
        <div className="flex flex-wrap gap-2">
          {(Object.entries(TYPE_CFG) as [keyof typeof TYPE_CFG, typeof TYPE_CFG[keyof typeof TYPE_CFG]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => { setType(key); setOpen(true); }}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all"
              style={{ background: DS.surfaceHover, color: cfg.color, border: `1px solid ${DS.border}` }}>
              <cfg.icon className="w-3.5 h-3.5" /> {cfg.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: DS.surfaceHover, border: `1px solid ${DS.primaryBorder}` }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold flex items-center gap-1" style={{ color: TYPE_CFG[type].color }}>
              {(() => { const Icon = TYPE_CFG[type].icon; return <Icon className="w-3.5 h-3.5" />; })()}
              {TYPE_CFG[type].label} — {learnerName}
            </p>
            <button onClick={() => setOpen(false)} className="text-xs cursor-pointer" style={{ color: DS.textMuted }}>✕</button>
          </div>

          {type === 'excuse' && absentDates.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Absent session</label>
              <select value={absDate} onChange={e => setAbsDate(e.target.value)} className="form-select w-full text-sm">
                {absentDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {type !== 'excuse' && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Brief subject…" className="form-input w-full text-sm" />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>
              {type === 'excuse' ? 'Reason for absence' : type === 'concern' ? 'Describe your concern' : 'Message'}
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder={type === 'excuse' ? 'Please explain why your child was absent…' : type === 'concern' ? 'What would you like to flag?…' : 'Your message to the coordinator…'}
              rows={3} className="form-input w-full text-sm resize-none" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: DS.surface, color: DS.textMid }}>
              Cancel
            </button>
            <button onClick={send} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
              style={{ background: DS.primary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><Send className="w-4 h-4" />Send</>}
            </button>
          </div>
        </div>
      )}

      {/* Message history */}
      {messages.length > 0 && (
        <div>
          <button onClick={() => setHistOpen(o => !o)}
            className="flex items-center gap-2 text-xs font-semibold cursor-pointer w-full"
            style={{ color: DS.textMid }}>
            {histOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Message history ({messages.length})
            {unread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
                {unread} repl{unread === 1 ? 'y' : 'ies'}
              </span>
            )}
          </button>

          {histOpen && (
            <div className="mt-2 space-y-2">
              {messages.map(m => (
                <div key={m.message_id} className="rounded-xl p-3 space-y-2"
                  style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold" style={{ color: DS.text }}>{m.subject}</p>
                      <p className="text-[10px]" style={{ color: DS.textMuted }}>
                        {new Date(m.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold shrink-0"
                      style={{ color: m.status === 'replied' ? 'var(--ds-success)' : DS.textMuted }}>
                      {m.status === 'replied' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {m.status === 'replied' ? 'Replied' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: DS.textMuted }}>{m.body}</p>
                  {m.reply_body && (
                    <div className="rounded-lg p-2.5"
                      style={{ background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--ds-success)' }}>
                        Coordinator replied:
                      </p>
                      <p className="text-xs" style={{ color: DS.text }}>{m.reply_body}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
