'use client';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, X, Loader2, ChevronDown, Award } from 'lucide-react';
import { cn } from '@/utils';

interface Sponsor       { sponsor_id: string; sponsor_name: string }
interface Props {
  learnerId:       string;
  currentSponsors: Sponsor[];
  allSponsors:     Sponsor[];
  canEdit:         boolean;
}

// Distinct colour per sponsor name (hashed)
function sponsorColor(name: string) {
  const colors = [
    { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' }, // violet
    { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' }, // blue
    { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' }, // green
    { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' }, // yellow
    { bg: '#FCE7F3', text: '#9D174D', border: '#F9A8D4' }, // pink
    { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' }, // orange
    { bg: '#CFFAFE', text: '#155E75', border: '#A5F3FC' }, // cyan
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(hash) % colors.length];
}

export default function SponsorCell({ learnerId, currentSponsors: init, allSponsors, canEdit }: Props) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(init);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const assignedIds = sponsors.map(s => s.sponsor_id);
  const available   = allSponsors.filter(s => !assignedIds.includes(s.sponsor_id));

  const add = async (sponsor: Sponsor) => {
    setLoading(sponsor.sponsor_id);
    try {
      const res = await fetch(`/api/v1/sponsors/${sponsor.sponsor_id}/learners`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ learner_id: learnerId }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed');
      }
      // Add the full sponsor object (with name) to local state immediately
      setSponsors(prev => [...prev, { sponsor_id: sponsor.sponsor_id, sponsor_name: sponsor.sponsor_name }]);
      setOpen(false);
      toast.success(`Linked to ${sponsor.sponsor_name}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const remove = async (sponsor: Sponsor) => {
    setLoading('rm-' + sponsor.sponsor_id);
    try {
      const res = await fetch(`/api/v1/sponsors/${sponsor.sponsor_id}/learners/${learnerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove');
      setSponsors(prev => prev.filter(s => s.sponsor_id !== sponsor.sponsor_id));
      toast.success(`Removed from ${sponsor.sponsor_name}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div ref={ref} className="relative min-w-[120px]">
      {/* Current sponsor badges */}
      <div className="flex flex-wrap gap-1 items-center">
        {sponsors.map(s => {
          const c = sponsorColor(s.sponsor_name);
          return (
            <span key={s.sponsor_id}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
              {s.sponsor_name}
              {canEdit && (
                <button
                  onClick={e => { e.stopPropagation(); remove(s); }}
                  disabled={loading === 'rm-' + s.sponsor_id}
                  className="ml-0.5 hover:opacity-70 transition-opacity">
                  {loading === 'rm-' + s.sponsor_id
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    : <X className="w-2.5 h-2.5" />}
                </button>
              )}
            </span>
          );
        })}

        {/* Add button — admin only */}
        {canEdit && available.length > 0 && (
          <button
            onClick={() => setOpen(p => !p)}
            className={cn(
              'inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition-all',
              open
                ? 'bg-brand-50 text-brand-700 border-brand-300'
                : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-brand-300 hover:text-brand-600'
            )}>
            <Plus className="w-3 h-3" />
            {sponsors.length === 0 ? 'Add sponsor' : ''}
          </button>
        )}

        {/* No sponsor + no edit */}
        {sponsors.length === 0 && !canEdit && (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[160px]">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Assign Sponsor
          </p>
          {available.map(s => {
            const c = sponsorColor(s.sponsor_name);
            return (
              <button key={s.sponsor_id}
                onClick={() => { add(s); setOpen(false); }}
                disabled={!!loading}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left">
                {loading === s.sponsor_id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                  : <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: c.text }} />}
                <span className="text-sm text-gray-700">{s.sponsor_name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
