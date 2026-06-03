'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, Search, CheckCircle2, X, UserCheck, Users } from 'lucide-react';
import { cn } from '@/utils';

interface Sponsor { sponsor_id: string; sponsor_name: string }
interface Learner  { learner_id: string; learner_code: string; grade: number; full_name: string; school_name: string }
interface Props {
  sponsors:      Sponsor[];
  learners:      Learner[];
  existingLinks: Record<string, string[]>;
}

function sponsorColor(name: string) {
  const p = [
    { bg: '#EDE9FE', text: '#5B21B6', solid: '#7C3AED', light: '#F5F3FF' },
    { bg: '#DBEAFE', text: '#1E40AF', solid: '#2563EB', light: '#EFF6FF' },
    { bg: '#DCFCE7', text: '#15803D', solid: '#16A34A', light: '#F0FDF4' },
    { bg: '#FEF9C3', text: '#854D0E', solid: '#CA8A04', light: '#FEFCE8' },
    { bg: '#FCE7F3', text: '#9D174D', solid: '#DB2777', light: '#FDF2F8' },
    { bg: '#FFEDD5', text: '#9A3412', solid: '#EA580C', light: '#FFF7ED' },
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % p.length;
  return p[Math.abs(h) % p.length];
}

export default function BulkLinkClient({ sponsors, learners, existingLinks }: Props) {
  const [links,   setLinks]   = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    Object.entries(existingLinks).forEach(([lid, sids]) => { m[lid] = new Set(sids); });
    return m;
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [search,  setSearch]  = useState('');

  const filtered = useMemo(() => {
    if (!search) return learners;
    const q = search.toLowerCase();
    return learners.filter(l =>
      l.full_name.toLowerCase().includes(q) ||
      l.learner_code.toLowerCase().includes(q) ||
      l.school_name.toLowerCase().includes(q)
    );
  }, [learners, search]);

  // Per-sponsor stats
  const sponsorStats = (sponsorId: string) => {
    const total   = learners.length;
    const linked  = learners.filter(l => links[l.learner_id]?.has(sponsorId)).length;
    const missing = total - linked;
    return { total, linked, missing };
  };

  // Link one learner to one sponsor
  const toggle = async (learnerId: string, sponsorId: string) => {
    const isLinked = links[learnerId]?.has(sponsorId);
    const key = (isLinked ? 'rm-' : '') + `${learnerId}-${sponsorId}`;
    setLoading(key);
    try {
      if (isLinked) {
        const res = await fetch(`/api/v1/sponsors/${sponsorId}/learners/${learnerId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove');
        setLinks(prev => {
          const next = { ...prev };
          next[learnerId] = new Set([...(next[learnerId] || [])].filter(id => id !== sponsorId));
          return next;
        });
      } else {
        const res = await fetch(`/api/v1/sponsors/${sponsorId}/learners`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learner_id: learnerId }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed'); }
        setLinks(prev => {
          const next = { ...prev };
          next[learnerId] = new Set([...(next[learnerId] || []), sponsorId]);
          return next;
        });
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(null); }
  };

  // Add ALL unlinked learners to this sponsor at once
  const addAllToSponsor = async (sponsorId: string, sponsorName: string) => {
    const toAdd = learners.filter(l => !links[l.learner_id]?.has(sponsorId));
    if (!toAdd.length) { toast.info(`All learners are already linked to ${sponsorName}`); return; }

    setLoading('addall-' + sponsorId);
    let success = 0;
    let failed  = 0;

    for (const l of toAdd) {
      try {
        const res = await fetch(`/api/v1/sponsors/${sponsorId}/learners`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learner_id: l.learner_id }),
        });
        if (res.ok) {
          setLinks(prev => {
            const next = { ...prev };
            next[l.learner_id] = new Set([...(next[l.learner_id] || []), sponsorId]);
            return next;
          });
          success++;
        } else { failed++; }
      } catch { failed++; }
    }

    setLoading(null);
    if (success > 0) toast.success(`✓ ${success} learner${success > 1 ? 's' : ''} added to ${sponsorName}`);
    if (failed  > 0) toast.error(`${failed} failed — try again`);
  };

  // Remove ALL learners from this sponsor
  const removeAllFromSponsor = async (sponsorId: string, sponsorName: string) => {
    const toRemove = learners.filter(l => links[l.learner_id]?.has(sponsorId));
    if (!toRemove.length) { toast.info(`No learners linked to ${sponsorName}`); return; }
    if (!confirm(`Remove all ${toRemove.length} learners from ${sponsorName}?`)) return;

    setLoading('rmall-' + sponsorId);
    let count = 0;
    for (const l of toRemove) {
      try {
        const res = await fetch(`/api/v1/sponsors/${sponsorId}/learners/${l.learner_id}`, { method: 'DELETE' });
        if (res.ok) {
          setLinks(prev => {
            const next = { ...prev };
            next[l.learner_id] = new Set([...(next[l.learner_id] || [])].filter(id => id !== sponsorId));
            return next;
          });
          count++;
        }
      } catch {}
    }
    setLoading(null);
    toast.success(`Removed ${count} learners from ${sponsorName}`);
  };

  const totalLinked   = learners.filter(l => (links[l.learner_id]?.size ?? 0) > 0).length;
  const totalUnlinked = learners.length - totalLinked;

  return (
    <div className="space-y-6">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{learners.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Learners</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-mint-600">{totalLinked}</p>
          <p className="text-xs text-gray-500 mt-1">Linked to a Sponsor</p>
        </div>
        <div className={cn('rounded-xl border shadow-sm p-4 text-center',
          totalUnlinked > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100')}>
          <p className={cn('text-3xl font-bold', totalUnlinked > 0 ? 'text-amber-600' : 'text-gray-300')}>
            {totalUnlinked}
          </p>
          <p className="text-xs text-gray-500 mt-1">Not Yet Linked</p>
        </div>
      </div>

      {/* Per-sponsor ADD ALL buttons — the main feature */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Add All Learners to a Sponsor</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Click <strong>"Add All"</strong> under a sponsor to link every learner to them instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map(s => {
            const pal   = sponsorColor(s.sponsor_name);
            const stats = sponsorStats(s.sponsor_id);
            const pct   = stats.total > 0 ? Math.round(stats.linked / stats.total * 100) : 0;
            const busy  = loading === 'addall-' + s.sponsor_id || loading === 'rmall-' + s.sponsor_id;

            return (
              <div key={s.sponsor_id}
                className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: pal.bg }}>

                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3"
                  style={{ background: pal.bg }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: pal.solid }}>
                    {s.sponsor_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: pal.text }}>{s.sponsor_name}</p>
                    <p className="text-xs" style={{ color: pal.text, opacity: 0.7 }}>
                      {stats.linked} / {stats.total} learners linked
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100">
                  <div className="h-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: pal.solid }} />
                </div>

                {/* Action buttons */}
                <div className="p-4 flex gap-2">
                  <button
                    onClick={() => addAllToSponsor(s.sponsor_id, s.sponsor_name)}
                    disabled={busy || stats.missing === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 shadow-sm"
                    style={{ background: pal.solid }}>
                    {loading === 'addall-' + s.sponsor_id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <UserCheck className="w-4 h-4" />}
                    {stats.missing === 0 ? 'All Added ✓' : `Add All ${stats.missing}`}
                  </button>

                  {stats.linked > 0 && (
                    <button
                      onClick={() => removeAllFromSponsor(s.sponsor_id, s.sponsor_name)}
                      disabled={busy}
                      className="px-3 py-2.5 rounded-xl text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                      {loading === 'rmall-' + s.sponsor_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <X className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Individual Links</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click ✓ to link · Click again to remove</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search learner…" className="form-input pl-9 py-1.5 text-sm w-full" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-24">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Learner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">School</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 w-12">Gr</th>
                {sponsors.map(s => {
                  const pal   = sponsorColor(s.sponsor_name);
                  const stats = sponsorStats(s.sponsor_id);
                  return (
                    <th key={s.sponsor_id}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-28"
                      style={{ color: pal.solid }}>
                      <div>{s.sponsor_name}</div>
                      <div className="text-[10px] font-normal mt-0.5" style={{ color: pal.text, opacity: 0.6 }}>
                        {stats.linked}/{stats.total}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.learner_id}
                  className={cn('border-t border-gray-100 transition-colors hover:bg-gray-50/50',
                    i % 2 === 1 && 'bg-gray-50/30')}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{l.learner_code}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-800">{l.full_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{l.school_name}</td>
                  <td className="px-4 py-3 text-center text-xs font-mono text-gray-400">{l.grade}</td>

                  {sponsors.map(s => {
                    const pal      = sponsorColor(s.sponsor_name);
                    const isLinked = links[l.learner_id]?.has(s.sponsor_id) ?? false;
                    const addKey   = `${l.learner_id}-${s.sponsor_id}`;
                    const rmKey    = `rm-${l.learner_id}-${s.sponsor_id}`;
                    const busy     = loading === addKey || loading === rmKey;

                    return (
                      <td key={s.sponsor_id} className="px-4 py-3 text-center">
                        {busy ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" />
                        ) : (
                          <button
                            onClick={() => toggle(l.learner_id, s.sponsor_id)}
                            title={isLinked ? `Remove from ${s.sponsor_name}` : `Link to ${s.sponsor_name}`}
                            className="mx-auto flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95">
                            {isLinked ? (
                              <CheckCircle2 className="w-6 h-6 drop-shadow-sm" style={{ color: pal.solid }} />
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                                <span className="text-gray-300 text-sm font-bold leading-none">+</span>
                              </div>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
