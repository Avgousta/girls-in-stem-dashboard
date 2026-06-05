'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';

interface Meeting {
  meeting_id:   string;
  title:        string;
  description:  string | null;
  meeting_url:  string;
  platform:     string;
  scheduled_at: string;
  duration_min: number;
  users:        { full_name: string } | null;
  programs:     { program_name: string } | null;
  myRating:     { rating: number; comment: string } | null;
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  zoom:   { label: 'Zoom',         color: '#2D8CFF', emoji: '🎥' },
  meet:   { label: 'Google Meet',  color: '#34A853', emoji: '🟢' },
  teams:  { label: 'MS Teams',     color: '#6264A7', emoji: '💼' },
  other:  { label: 'Online Class', color: '#818CF8', emoji: '🔗' },
};

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: string }) {
  const [hover, setHover] = useState(0);
  const sz = size === 'lg' ? 'text-3xl' : 'text-xl';
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`${sz} transition-transform hover:scale-125 active:scale-110`}>
          {(hover || value) >= star ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

function RatingModal({ meeting, onClose, onSave }: {
  meeting: Meeting; onClose: () => void; onSave: (r: number, c: string) => void;
}) {
  const [rating,  setRating]  = useState(meeting.myRating?.rating || 0);
  const [comment, setComment] = useState(meeting.myRating?.comment || '');
  const [saving,  setSaving]  = useState(false);

  const PROMPTS: Record<number, string> = {
    1: 'What could be improved?',
    2: 'What didn\'t work for you?',
    3: 'What was okay, what wasn\'t?',
    4: 'What made it great?',
    5: 'What made it amazing? 🔥',
  };

  const handleSave = async () => {
    if (!rating) { toast.error('Pick a star rating'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/meetings/rate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ meeting_id: meeting.meeting_id, rating, comment }),
      });
      if (!res.ok) throw new Error('Failed to save rating');
      onSave(rating, comment);
      toast.success('Rating saved! Thanks for the feedback 🙌');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="text-center">
          <p className="text-2xl mb-1">🎓</p>
          <h3 className="text-lg font-black text-white">Rate this class</h3>
          <p className="text-white/40 text-sm mt-0.5 line-clamp-1">{meeting.title}</p>
        </div>

        <div className="text-center space-y-2">
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <p className="text-xs text-white/40 font-medium">
              {['', '😕 Poor', '😐 Fair', '😊 Good', '😄 Great', '🤩 Amazing!'][rating]}
            </p>
          )}
        </div>

        {rating > 0 && (
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder={PROMPTS[rating] || 'Share your thoughts...'}
            className="w-full rounded-2xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/40"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !rating}
            className="flex-1 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4F2D7F, #2DD4A0)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MeetingsClient({ meetings: initial, learnerId }: { meetings: Meeting[]; learnerId: string }) {
  const [meetings,   setMeetings]   = useState(initial);
  const [ratingFor,  setRatingFor]  = useState<Meeting | null>(null);

  const now      = Date.now();
  const upcoming = meetings.filter(m => new Date(m.scheduled_at).getTime() + m.duration_min * 60000 > now - 30*60000);
  const past     = meetings.filter(m => new Date(m.scheduled_at).getTime() + m.duration_min * 60000 <= now - 30*60000);

  const getStatus = (m: Meeting) => {
    const start  = new Date(m.scheduled_at).getTime();
    const end    = start + m.duration_min * 60000;
    const diff   = Math.round((start - now) / 60000);
    if (now >= start && now <= end) return { label: '🔴 Live Now', live: true, canJoin: true };
    if (diff <= 15 && diff > 0)     return { label: `⚡ In ${diff}m`,  live: false, canJoin: true };
    if (diff <= 0 && now > end)     return { label: '✅ Ended',         live: false, canJoin: false };
    if (diff <= 60*24)              return { label: `📅 Today`,         live: false, canJoin: false };
    return                                  { label: '📅 Upcoming',     live: false, canJoin: false };
  };

  const handleRatingSaved = (meetingId: string, rating: number, comment: string) => {
    setMeetings(prev => prev.map(m => m.meeting_id === meetingId ? { ...m, myRating: { rating, comment } } : m));
    setRatingFor(null);
  };

  if (meetings.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">📭</div>
      <p className="font-bold" style={{ color: 'var(--t-muted)' }}>No classes scheduled yet</p>
      <p className="text-sm mt-1" style={{ color: 'var(--t-muted)' }}>Your teacher will add classes here</p>
    </div>
  );

  const MeetingCard = ({ m }: { m: Meeting }) => {
    const status = getStatus(m);
    const plt    = PLATFORM_CONFIG[m.platform] || PLATFORM_CONFIG.other;
    const start  = new Date(m.scheduled_at);
    const dateStr = start.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = start.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const isPast  = !status.live && start.getTime() + m.duration_min * 60000 < now;

    return (
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: status.live ? 'rgba(22,163,74,0.12)' : 'var(--t-card)',
          border:     `1px solid ${status.live ? 'rgba(22,163,74,0.4)' : 'var(--t-border)'}`,
        }}>
        {status.live && (
          <div className="px-4 py-2 flex items-center gap-2"
            style={{ background: 'rgba(22,163,74,0.2)', borderBottom: '1px solid rgba(22,163,74,0.3)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs font-black text-green-400 tracking-widest uppercase">Live Right Now!</p>
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{plt.emoji}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  {status.label}
                </span>
              </div>
              <h3 className="font-black text-sm leading-tight" style={{ color: 'var(--t-text)' }}>{m.title}</h3>
              {m.programs && <p className="text-xs mt-0.5" style={{ color: 'var(--t-muted)' }}>📚 {m.programs.program_name}</p>}
              {(m.users as any)?.full_name && <p className="text-xs" style={{ color: 'var(--t-muted)' }}>👩‍🏫 {(m.users as any).full_name}</p>}
            </div>
            {/* My rating badge */}
            {m.myRating && (
              <button onClick={() => setRatingFor(m)}
                className="shrink-0 text-center">
                <div className="text-lg">{'⭐'.repeat(m.myRating.rating)}</div>
                <p className="text-[9px] text-white/30">Tap to edit</p>
              </button>
            )}
          </div>

          {m.description && (
            <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--t-card)', color: 'var(--t-muted)' }}>{m.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--t-muted)' }}>
            <span>📅 {dateStr}</span>
            <span>🕐 {timeStr}</span>
            <span>⏱ {m.duration_min >= 60 ? `${m.duration_min/60}h` : `${m.duration_min}m`}</span>
          </div>

          <div className="flex gap-2">
            {/* Join button */}
            <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black transition-all ${
                status.canJoin || status.live
                  ? 'text-white'
                  : 'text-white/30 pointer-events-none'
              }`}
              style={{
                background: status.live
                  ? 'linear-gradient(135deg, #16A34A, #2DD4A0)'
                  : status.canJoin
                  ? `linear-gradient(135deg, ${plt.color}cc, ${plt.color})`
                  : 'rgba(255,255,255,0.06)',
              }}>
              <ExternalLink className="w-4 h-4" />
              {status.live ? 'Join Now 🔴' : status.canJoin ? `Open ${plt.label}` : `Opens at ${timeStr}`}
            </a>

            {/* Rate button — only for past meetings */}
            {isPast && (
              <button onClick={() => setRatingFor(m)}
                className="px-4 py-3 rounded-2xl text-xs font-black transition-all"
                style={{
                  background: m.myRating ? 'rgba(253,211,77,0.15)' : 'rgba(255,255,255,0.06)',
                  color:      m.myRating ? '#FCD34D' : 'rgba(255,255,255,0.5)',
                  border:     m.myRating ? '1px solid rgba(253,211,77,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                {m.myRating ? `${m.myRating.rating}⭐` : '⭐ Rate'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map(m => <MeetingCard key={m.meeting_id} m={m} />)}
        </div>
      )}

      {/* Past meetings */}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t-muted)' }}>Past Classes</p>
          <div className="space-y-3">
            {past.slice(0, 5).map(m => <MeetingCard key={m.meeting_id} m={m} />)}
          </div>
        </div>
      )}

      {/* Rating modal */}
      {ratingFor && (
        <RatingModal
          meeting={ratingFor}
          onClose={() => setRatingFor(null)}
          onSave={(rating, comment) => handleRatingSaved(ratingFor.meeting_id, rating, comment)}
        />
      )}
    </div>
  );
}
