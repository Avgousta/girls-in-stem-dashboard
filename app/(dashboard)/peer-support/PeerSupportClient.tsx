'use client';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Users, Sparkles, CheckCircle2, Loader2, PauseCircle, XCircle, RefreshCw } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import Link from 'next/link';

interface Program { program_id: string; program_name: string }

interface LearnerStub {
  learner_id: string;
  grade: number | null;
  learner_profiles: { first_name: string; last_name: string } | null;
  risk_scores: { avg_score?: number; risk_level?: string; risk_trajectory?: string } | null;
}

interface Pair {
  pair_id:    string;
  status:     string;
  notes:      string | null;
  started_at: string | null;
  ended_at:   string | null;
  created_at: string;
  tutor:      LearnerStub | null;
  mentee:     LearnerStub | null;
  programs:   { program_name: string } | null;
  creator:    { full_name: string } | null;
}

interface Suggestion {
  tutor:          { learner_id: string; name: string; attRate: number; avgScore: number };
  mentee:         { learner_id: string; name: string; riskLevel: string };
  shared_program: string | null;
}

interface Props {
  initialPairs: Pair[];
  programs:     Program[];
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  suggested: { label: 'Suggested', color: '#A78BFA',          bg: 'rgba(167,139,250,0.12)' },
  active:    { label: 'Active',    color: 'var(--ds-success)', bg: 'var(--ds-success-light)' },
  paused:    { label: 'Paused',    color: 'var(--ds-warn)',    bg: 'var(--ds-warn-light)' },
  ended:     { label: 'Ended',     color: DS.textMuted as string, bg: DS.surfaceHover as string },
};

const RISK_COLOR: Record<string, string> = {
  high:   'var(--ds-danger)',
  medium: 'var(--ds-warn)',
  low:    'var(--ds-success)',
};

function learnerName(l: LearnerStub | null) {
  if (!l?.learner_profiles) return 'Unknown';
  return `${l.learner_profiles.first_name} ${l.learner_profiles.last_name}`;
}

export default function PeerSupportClient({ initialPairs, programs }: Props) {
  const [pairs,       setPairs]       = useState<Pair[]>(initialPairs);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [activating,  setActivating]  = useState<string | null>(null);
  const [filterProg,  setFilterProg]  = useState('');

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const url = '/api/v1/peer-support?suggest=true' + (filterProg ? `&program_id=${filterProg}` : '');
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load suggestions');
      setSuggestions(json.suggestions ?? []);
      toast.success(`Found ${json.suggestions?.length ?? 0} suggested pairings`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [filterProg]);

  const activateSuggestion = async (s: Suggestion) => {
    const key = `${s.tutor.learner_id}-${s.mentee.learner_id}`;
    setActivating(key);
    try {
      const res = await fetch('/api/v1/peer-support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutor_id: s.tutor.learner_id, mentee_id: s.mentee.learner_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create pair');
      toast.success('Pair activated');
      // Refresh pairs list and remove from suggestions
      const pairsRes = await fetch('/api/v1/peer-support');
      const pairsJson = await pairsRes.json();
      setPairs(pairsJson ?? []);
      setSuggestions(prev => (prev ?? []).filter(
        x => !(x.tutor.learner_id === s.tutor.learner_id || x.mentee.learner_id === s.mentee.learner_id)
      ));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setActivating(null);
    }
  };

  const updatePairStatus = async (pairId: string, status: string) => {
    setActivating(pairId);
    try {
      const res = await fetch(`/api/v1/peer-support/${pairId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update pair');
      toast.success(`Pair ${status}`);
      setPairs(prev => prev.map(p => p.pair_id === pairId ? { ...p, status } : p));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setActivating(null);
    }
  };

  const activePairs  = pairs.filter(p => p.status === 'active');
  const pausedPairs  = pairs.filter(p => p.status === 'paused');

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterProg} onChange={e => setFilterProg(e.target.value)}
          className="form-select text-sm max-w-xs" style={{ background: DS.surface, color: DS.text, borderColor: DS.border }}>
          <option value="">All programmes</option>
          {programs.map(p => (
            <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
          ))}
        </select>

        <button onClick={fetchSuggestions} disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          style={{ background: DS.primary, color: '#fff' }}>
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analysing…' : 'Suggest Pairings'}
        </button>
      </div>

      {/* Suggestions */}
      {suggestions !== null && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: DS.textMid }}>
            <Sparkles className="w-4 h-4" style={{ color: '#A78BFA' }} />
            Suggested Pairings
            <span className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: DS.surfaceHover, color: DS.textMuted }}>{suggestions.length}</span>
          </h2>

          {suggestions.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-sm" style={{ color: DS.textMuted }}>
                No new pairings to suggest right now — all eligible learners may already be paired.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => {
                const key = `${s.tutor.learner_id}-${s.mentee.learner_id}`;
                const isLoading = activating === key;
                return (
                  <div key={key} className="rounded-2xl p-4 flex items-center gap-4 flex-wrap"
                    style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>

                    {/* Tutor */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A78BFA' }}>Tutor</p>
                      <Link href={`/learners/${s.tutor.learner_id}`}
                        className="font-semibold text-sm hover:underline" style={{ color: DS.text }}>
                        {s.tutor.name}
                      </Link>
                      <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
                        {Math.round(s.tutor.attRate * 100)}% att · {Math.round(s.tutor.avgScore)}% avg
                      </p>
                    </div>

                    <div className="text-xl" style={{ color: DS.textMuted }}>→</div>

                    {/* Mentee */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                        style={{ color: RISK_COLOR[s.mentee.riskLevel] ?? DS.textMuted }}>
                        Mentee · {s.mentee.riskLevel} risk
                      </p>
                      <Link href={`/learners/${s.mentee.learner_id}`}
                        className="font-semibold text-sm hover:underline" style={{ color: DS.text }}>
                        {s.mentee.name}
                      </Link>
                      {s.shared_program && (
                        <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{s.shared_program}</p>
                      )}
                    </div>

                    {/* Activate */}
                    <button onClick={() => activateSuggestion(s)} disabled={isLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors shrink-0"
                      style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Activate
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Active pairs */}
      {activePairs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: DS.textMid }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ds-success)' }} />
            Active Pairs
            <span className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: DS.surfaceHover, color: DS.textMuted }}>{activePairs.length}</span>
          </h2>
          <div className="space-y-3">
            {activePairs.map(pair => <PairCard key={pair.pair_id} pair={pair} onUpdate={updatePairStatus} activating={activating} />)}
          </div>
        </section>
      )}

      {/* Paused pairs */}
      {pausedPairs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: DS.textMid }}>
            <PauseCircle className="w-4 h-4" style={{ color: 'var(--ds-warn)' }} />
            Paused Pairs
            <span className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: DS.surfaceHover, color: DS.textMuted }}>{pausedPairs.length}</span>
          </h2>
          <div className="space-y-3">
            {pausedPairs.map(pair => <PairCard key={pair.pair_id} pair={pair} onUpdate={updatePairStatus} activating={activating} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {activePairs.length === 0 && pausedPairs.length === 0 && suggestions === null && (
        <div className="rounded-2xl p-10 text-center" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: DS.textMuted }} />
          <p className="font-semibold mb-1" style={{ color: DS.text }}>No active pairs yet</p>
          <p className="text-sm" style={{ color: DS.textMuted }}>
            Click <strong>Suggest Pairings</strong> to automatically match strong learners with at-risk peers.
          </p>
        </div>
      )}
    </div>
  );
}

function PairCard({ pair, onUpdate, activating }: {
  pair:       Pair;
  onUpdate:   (id: string, status: string) => void;
  activating: string | null;
}) {
  const cfg     = STATUS_CFG[pair.status] ?? STATUS_CFG.suggested;
  const isLoading = activating === pair.pair_id;

  return (
    <div className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="flex items-start gap-4 flex-wrap">

        {/* Tutor */}
        <div className="flex-1 min-w-[140px]">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A78BFA' }}>Tutor</p>
          <Link href={`/learners/${pair.tutor?.learner_id}`}
            className="font-semibold text-sm hover:underline" style={{ color: DS.text }}>
            {learnerName(pair.tutor)}
          </Link>
          {pair.tutor?.risk_scores?.avg_score != null && (
            <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
              {Math.round(pair.tutor.risk_scores.avg_score)}% avg score
            </p>
          )}
        </div>

        <div className="text-lg mt-4" style={{ color: DS.textMuted }}>→</div>

        {/* Mentee */}
        <div className="flex-1 min-w-[140px]">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: RISK_COLOR[pair.mentee?.risk_scores?.risk_level ?? 'low'] }}>
            Mentee · {pair.mentee?.risk_scores?.risk_level ?? '—'} risk
          </p>
          <Link href={`/learners/${pair.mentee?.learner_id}`}
            className="font-semibold text-sm hover:underline" style={{ color: DS.text }}>
            {learnerName(pair.mentee)}
          </Link>
          {pair.programs?.program_name && (
            <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{pair.programs.program_name}</p>
          )}
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>

          {pair.status === 'active' && (
            <button onClick={() => onUpdate(pair.pair_id, 'paused')} disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors"
              style={{ borderColor: DS.border, color: DS.textMid }}>
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3 h-3" />}
              Pause
            </button>
          )}

          {pair.status === 'paused' && (
            <button onClick={() => onUpdate(pair.pair_id, 'active')} disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Resume
            </button>
          )}

          {pair.status !== 'ended' && (
            <button onClick={() => onUpdate(pair.pair_id, 'ended')} disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors"
              style={{ borderColor: 'var(--ds-danger)', color: 'var(--ds-danger)' }}>
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              End
            </button>
          )}
        </div>
      </div>

      {pair.notes && (
        <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: DS.surfaceHover, color: DS.textMid }}>
          {pair.notes}
        </p>
      )}
    </div>
  );
}
