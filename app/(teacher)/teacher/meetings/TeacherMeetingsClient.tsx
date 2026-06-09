'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Video, ExternalLink, Trash2, Clock, Calendar, X, Link2 } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

interface Meeting {
  meeting_id: string; title: string; description: string | null;
  meeting_url: string; platform: string; scheduled_at: string;
  duration_min: number; is_cancelled: boolean; created_at: string;
  programs: { program_name: string; program_type: string } | null;
}
interface Program { program_id: string; program_name: string; program_type: string }
interface Props   { meetings: Meeting[]; programs: Program[]; instructorId: string }

const PLATFORM_CONFIG = {
  zoom:   { label: 'Zoom',        color: '#2D8CFF', icon: '🎥' },
  meet:   { label: 'Google Meet', color: '#34A853', icon: '🟢' },
  teams:  { label: 'MS Teams',    color: '#6264A7', icon: '💼' },
  other:  { label: 'Online',      color: DS.primary as string, icon: '🔗' },
};

function getMeetingStatus(scheduledAt: string) {
  const diff = new Date(scheduledAt).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (diff < -60 * 60000) return { label: 'Ended',      color: DS.textMuted as string,         bg: DS.surfaceHover as string };
  if (diff < 0)           return { label: 'In Progress', color: 'var(--ds-success)',             bg: 'var(--ds-success-light)', pulse: true };
  if (mins <= 30)         return { label: `In ${mins}m`, color: 'var(--ds-warn)',                bg: 'var(--ds-warn-light)',    pulse: true };
  if (mins <= 60 * 24)    return { label: 'Today',       color: '#818CF8',                       bg: 'rgba(129,140,248,0.15)' };
  return                         { label: 'Upcoming',    color: DS.primary as string,            bg: DS.primaryLight as string };
}

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
  };
}

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '5px', color: DS.textMuted as string,
};

export default function TeacherMeetingsClient({ meetings: initial, programs, instructorId }: Props) {
  const [meetings, setMeetings] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', meeting_url: '',
    platform: 'zoom' as 'zoom'|'meet'|'teams'|'other',
    scheduled_at: '', duration_min: 60, program_id: '',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const detectPlatform = (url: string) => {
    if (url.includes('zoom.us'))             set('platform', 'zoom');
    else if (url.includes('meet.google'))    set('platform', 'meet');
    else if (url.includes('teams.microsoft') || url.includes('teams.live')) set('platform', 'teams');
    else set('platform', 'other');
  };

  const handleCreate = async () => {
    if (!form.title.trim())       { toast.error('Enter a meeting title'); return; }
    if (!form.meeting_url.trim()) { toast.error('Enter the meeting link'); return; }
    if (!form.scheduled_at)       { toast.error('Set a date and time');   return; }
    if (new Date(form.scheduled_at) < new Date()) { toast.error('Cannot schedule in the past'); return; }

    setLoading('create');
    try {
      const res  = await fetch('/api/v1/meetings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, program_id: form.program_id || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create meeting');
      setMeetings(prev => [...prev, {
        ...json.data,
        programs: programs.find(p => p.program_id === form.program_id) || null,
      }].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
      setForm({ title:'', description:'', meeting_url:'', platform:'zoom', scheduled_at:'', duration_min:60, program_id:'' });
      setShowForm(false);
      toast.success('Meeting scheduled! Learners will be notified.');
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  };

  const handleCancel = async (meetingId: string) => {
    if (!confirm('Cancel this meeting?')) return;
    setLoading(meetingId);
    try {
      const res = await fetch(`/api/v1/meetings/${meetingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setMeetings(prev => prev.filter(m => m.meeting_id !== meetingId));
      toast.success('Meeting cancelled');
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  };

  const upcoming = meetings.filter(m => new Date(m.scheduled_at) > new Date(Date.now() - 60 * 60000));
  const past     = meetings.filter(m => new Date(m.scheduled_at) <= new Date(Date.now() - 60 * 60000));
  const minDt    = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

  return (
    <div className="space-y-6">

      <div className="flex justify-end">
        <button onClick={() => setShowForm(p => !p)} className="btn-primary">
          <Plus className="w-4 h-4" /> Schedule Online Class
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: DS.surface, border: `2px solid ${DS.primaryBorder}` }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: DS.text }}>
              <Video className="w-5 h-5" style={{ color: DS.primary }} /> New Online Class
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl cursor-pointer"
              style={{ color: DS.textMuted }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label style={labelSt}>Class Title <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                className="form-input w-full" placeholder="e.g. Introduction to Python — Week 3" />
            </div>

            <div className="sm:col-span-2">
              <label style={labelSt}>Meeting Link <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
                <input type="url" value={form.meeting_url}
                  onChange={e => { set('meeting_url', e.target.value); detectPlatform(e.target.value); }}
                  className="form-input pl-9 w-full"
                  placeholder="https://zoom.us/j/123... or meet.google.com/..." />
              </div>
              {form.meeting_url && (
                <p className="text-xs mt-1 font-medium"
                  style={{ color: PLATFORM_CONFIG[form.platform].color }}>
                  {PLATFORM_CONFIG[form.platform].icon} Detected: {PLATFORM_CONFIG[form.platform].label}
                </p>
              )}
            </div>

            <div>
              <label style={labelSt}>Date & Time <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
              <input type="datetime-local" value={form.scheduled_at} min={minDt}
                onChange={e => set('scheduled_at', e.target.value)} className="form-input w-full" />
            </div>

            <div>
              <label style={labelSt}>Duration</label>
              <select value={form.duration_min} onChange={e => set('duration_min', Number(e.target.value))}
                className="form-select w-full">
                {[30,45,60,90,120].map(m => (
                  <option key={m} value={m}>{m >= 60 ? `${m/60}h${m%60 ? ` ${m%60}m` : ''}` : `${m} min`}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelSt}>Programme</label>
              <select value={form.program_id} onChange={e => set('program_id', e.target.value)}
                className="form-select w-full">
                <option value="">All my learners</option>
                {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
              </select>
              <p className="text-xs mt-1" style={{ color: DS.textMuted }}>Learners in this programme will be notified</p>
            </div>

            <div>
              <label style={labelSt}>Platform</label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)}
                className="form-select w-full">
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label style={labelSt}>Notes for Learners</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} className="form-input w-full"
                placeholder="What will be covered? Any preparation needed?" />
            </div>
          </div>

          <div className="flex gap-3 pt-2" style={{ borderTop: `1px solid ${DS.border}` }}>
            <button onClick={handleCreate} disabled={loading === 'create'} className="btn-primary">
              {loading === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              {loading === 'create' ? 'Scheduling…' : 'Schedule Class'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
          style={{ color: DS.textMuted }}>
          <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: '#818CF8' }} />
          Upcoming ({upcoming.length})
        </h2>

        {upcoming.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border-2 border-dashed"
            style={{ borderColor: DS.border }}>
            <Video className="w-10 h-10 mx-auto mb-2" style={{ color: DS.borderLight }} />
            <p className="text-sm" style={{ color: DS.textMuted }}>No upcoming classes scheduled.</p>
            <p className="text-xs mt-1" style={{ color: DS.textMuted }}>Click "Schedule Online Class" to add one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(m => {
              const plt    = PLATFORM_CONFIG[m.platform as keyof typeof PLATFORM_CONFIG] || PLATFORM_CONFIG.other;
              const status = getMeetingStatus(m.scheduled_at);
              const dt     = formatDateTime(m.scheduled_at);
              return (
                <div key={m.meeting_id} className="rounded-2xl overflow-hidden"
                  style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                  <div className="flex">
                    <div className="w-1.5 flex-shrink-0" style={{ background: plt.color }} />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">{plt.icon}</span>
                            <h3 className="font-bold" style={{ color: DS.text }}>{m.title}</h3>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full${(status as any).pulse?' animate-pulse':''}`}
                              style={{ background: status.bg, color: status.color }}>
                              {status.label}
                            </span>
                          </div>
                          {m.programs && (
                            <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>📚 {m.programs.program_name}</p>
                          )}
                          {m.description && (
                            <p className="text-sm mt-1.5" style={{ color: DS.textMid }}>{m.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                            className="btn-primary text-xs py-1.5">
                            <ExternalLink className="w-3.5 h-3.5" /> Start Meeting
                          </a>
                          <button onClick={() => handleCancel(m.meeting_id)}
                            disabled={loading === m.meeting_id}
                            className="p-2 rounded-xl transition-colors cursor-pointer"
                            style={{ border: '1px solid var(--ds-danger)', color: 'var(--ds-danger)', background: 'var(--ds-danger-light)' }}>
                            {loading === m.meeting_id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3 pt-3" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
                        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: DS.textMid }}>
                          <Calendar className="w-3.5 h-3.5" style={{ color: DS.textMuted }} /> {dt.date}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: DS.textMid }}>
                          <Clock className="w-3.5 h-3.5" style={{ color: DS.textMuted }} /> {dt.time}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: DS.textMuted }}>
                          ⏱ {m.duration_min >= 60 ? `${m.duration_min/60}h${m.duration_min%60 ? ` ${m.duration_min%60}m` : ''}` : `${m.duration_min} min`}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-mono truncate max-w-[200px]"
                          style={{ color: DS.textMuted }}>
                          🔗 {m.meeting_url}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DS.textMuted }}>
            Past Meetings ({past.length})
          </h2>
          <div className="space-y-2">
            {past.slice(0, 5).map(m => {
              const plt = PLATFORM_CONFIG[m.platform as keyof typeof PLATFORM_CONFIG] || PLATFORM_CONFIG.other;
              const dt  = formatDateTime(m.scheduled_at);
              return (
                <div key={m.meeting_id} className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: DS.textMid }}>{plt.icon} {m.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{dt.date} at {dt.time}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: DS.border, color: DS.textMuted }}>Ended</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
