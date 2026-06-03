'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Video, ExternalLink, Trash2, Clock, Users, Calendar, X, Link2 } from 'lucide-react';
import { cn } from '@/utils';

interface Meeting {
  meeting_id: string; title: string; description: string | null;
  meeting_url: string; platform: string; scheduled_at: string;
  duration_min: number; is_cancelled: boolean; created_at: string;
  programs: { program_name: string; program_type: string } | null;
}
interface Program { program_id: string; program_name: string; program_type: string }
interface Props   { meetings: Meeting[]; programs: Program[]; instructorId: string }

const PLATFORM_CONFIG = {
  zoom:   { label: 'Zoom',        color: '#2D8CFF', bg: '#EFF6FF', icon: '🎥' },
  meet:   { label: 'Google Meet', color: '#34A853', bg: '#F0FDF4', icon: '🟢' },
  teams:  { label: 'MS Teams',    color: '#6264A7', bg: '#F0EFFF', icon: '💼' },
  other:  { label: 'Online',      color: '#6B7280', bg: '#F9FAFB', icon: '🔗' },
};

function getMeetingStatus(scheduledAt: string) {
  const now     = new Date();
  const meeting = new Date(scheduledAt);
  const diff    = meeting.getTime() - now.getTime();
  const mins    = Math.round(diff / 60000);

  if (diff < -60 * 60000)  return { label: 'Ended',       color: 'text-gray-400', bg: 'bg-gray-100' };
  if (diff < 0)            return { label: 'In Progress',  color: 'text-green-700', bg: 'bg-green-100', pulse: true };
  if (mins <= 30)          return { label: `In ${mins}m`,  color: 'text-amber-700', bg: 'bg-amber-100', pulse: true };
  if (mins <= 60 * 24)     return { label: 'Today',        color: 'text-blue-700',  bg: 'bg-blue-100' };
  return                          { label: 'Upcoming',     color: 'text-brand-700', bg: 'bg-brand-50' };
}

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function TeacherMeetingsClient({ meetings: initial, programs, instructorId }: Props) {
  const [meetings, setMeetings] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState<string | null>(null);

  const [form, setForm] = useState({
    title:        '',
    description:  '',
    meeting_url:  '',
    platform:     'zoom' as 'zoom' | 'meet' | 'teams' | 'other',
    scheduled_at: '',
    duration_min: 60,
    program_id:   '',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Detect platform from URL
  const detectPlatform = (url: string) => {
    if (url.includes('zoom.us'))       set('platform', 'zoom');
    else if (url.includes('meet.google')) set('platform', 'meet');
    else if (url.includes('teams.microsoft') || url.includes('teams.live')) set('platform', 'teams');
    else set('platform', 'other');
  };

  const handleCreate = async () => {
    if (!form.title.trim())        { toast.error('Enter a meeting title'); return; }
    if (!form.meeting_url.trim())  { toast.error('Enter the meeting link'); return; }
    if (!form.scheduled_at)        { toast.error('Set a date and time'); return; }
    if (new Date(form.scheduled_at) < new Date()) { toast.error('Cannot schedule in the past'); return; }

    setLoading('create');
    try {
      const res  = await fetch('/api/v1/meetings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          program_id: form.program_id || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create meeting');

      setMeetings(prev => [...prev, {
        ...json.data,
        programs: programs.find(p => p.program_id === form.program_id) || null,
      }].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));

      setForm({ title:'', description:'', meeting_url:'', platform:'zoom', scheduled_at:'', duration_min:60, program_id:'' });
      setShowForm(false);
      toast.success(`Meeting scheduled! Learners will be notified.`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(null); }
  };

  const handleCancel = async (meetingId: string) => {
    if (!confirm('Cancel this meeting? Learners will not be automatically notified.')) return;
    setLoading(meetingId);
    try {
      const res = await fetch(`/api/v1/meetings/${meetingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setMeetings(prev => prev.filter(m => m.meeting_id !== meetingId));
      toast.success('Meeting cancelled');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(null); }
  };

  const upcoming  = meetings.filter(m => new Date(m.scheduled_at) > new Date(Date.now() - 60*60000));
  const past      = meetings.filter(m => new Date(m.scheduled_at) <= new Date(Date.now() - 60*60000));

  // Min datetime for the input (now + 5 min)
  const minDt = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

  return (
    <div className="space-y-6">

      {/* Schedule button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(p => !p)} className="btn-primary">
          <Plus className="w-4 h-4" /> Schedule Online Class
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-brand-200 shadow-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-brand-700" /> New Online Class
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Class Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                className="form-input" placeholder="e.g. Introduction to Python — Week 3" />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Meeting Link <span className="text-red-500">*</span></label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url" value={form.meeting_url}
                  onChange={e => { set('meeting_url', e.target.value); detectPlatform(e.target.value); }}
                  className="form-input pl-9"
                  placeholder="https://zoom.us/j/123... or meet.google.com/..." />
              </div>
              {form.meeting_url && (
                <p className="text-xs mt-1 font-medium" style={{ color: PLATFORM_CONFIG[form.platform].color }}>
                  {PLATFORM_CONFIG[form.platform].icon} Detected: {PLATFORM_CONFIG[form.platform].label}
                </p>
              )}
            </div>

            <div>
              <label className="form-label">Date & Time <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={form.scheduled_at} min={minDt}
                onChange={e => set('scheduled_at', e.target.value)}
                className="form-input" />
            </div>

            <div>
              <label className="form-label">Duration</label>
              <select value={form.duration_min} onChange={e => set('duration_min', Number(e.target.value))}
                className="form-select">
                {[30,45,60,90,120].map(m => (
                  <option key={m} value={m}>{m >= 60 ? `${m/60}h${m%60 ? ` ${m%60}m` : ''}` : `${m} min`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Programme</label>
              <select value={form.program_id} onChange={e => set('program_id', e.target.value)}
                className="form-select">
                <option value="">All my learners</option>
                {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Learners in this programme will be notified
              </p>
            </div>

            <div>
              <label className="form-label">Platform</label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)}
                className="form-select">
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Notes for Learners</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} className="form-input"
                placeholder="What will be covered? Any preparation needed?" />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={handleCreate} disabled={loading === 'create'} className="btn-primary">
              {loading === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              {loading === 'create' ? 'Scheduling…' : 'Schedule Class'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Upcoming meetings */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Upcoming ({upcoming.length})
        </h2>

        {upcoming.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
            <Video className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No upcoming classes scheduled.</p>
            <p className="text-gray-400 text-xs mt-1">Click "Schedule Online Class" to add one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(m => {
              const plt    = PLATFORM_CONFIG[m.platform as keyof typeof PLATFORM_CONFIG] || PLATFORM_CONFIG.other;
              const status = getMeetingStatus(m.scheduled_at);
              const dt     = formatDateTime(m.scheduled_at);
              return (
                <div key={m.meeting_id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Coloured left bar */}
                  <div className="flex">
                    <div className="w-1.5 rounded-l-2xl flex-shrink-0" style={{ background: plt.color }} />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">{plt.icon}</span>
                            <h3 className="font-bold text-gray-900">{m.title}</h3>
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', status.bg, status.color,
                              (status as any).pulse && 'animate-pulse')}>
                              {status.label}
                            </span>
                          </div>
                          {m.programs && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              📚 {m.programs.program_name}
                            </p>
                          )}
                          {m.description && (
                            <p className="text-sm text-gray-500 mt-1.5">{m.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                            className="btn-primary text-xs py-1.5">
                            <ExternalLink className="w-3.5 h-3.5" /> Start Meeting
                          </a>
                          <button onClick={() => handleCancel(m.meeting_id)}
                            disabled={loading === m.meeting_id}
                            className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                            {loading === m.meeting_id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Date/time/duration row */}
                      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" /> {dt.date}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-400" /> {dt.time}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          ⏱ {m.duration_min >= 60 ? `${m.duration_min/60}h${m.duration_min%60 ? ` ${m.duration_min%60}m` : ''}` : `${m.duration_min} min`}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                          🔗 <span className="truncate max-w-[200px]">{m.meeting_url}</span>
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

      {/* Past meetings */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Past Meetings ({past.length})
          </h2>
          <div className="space-y-2">
            {past.slice(0, 5).map(m => {
              const plt = PLATFORM_CONFIG[m.platform as keyof typeof PLATFORM_CONFIG] || PLATFORM_CONFIG.other;
              const dt  = formatDateTime(m.scheduled_at);
              // Fetch ratings from the meeting object if available
              const ratings = (m as any).meeting_ratings || [];
              const avgRating = ratings.length
                ? (ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length).toFixed(1)
                : null;
              return (
                <div key={m.meeting_id}
                  className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{plt.icon} {m.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{dt.date} at {dt.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {avgRating && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        ⭐ {avgRating} ({ratings.length})
                      </span>
                    )}
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Ended</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
