'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { UserPlus, Trash2, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';

interface Enrolment {
  enrollment_id: string;
  status: string;
  learners: {
    learner_id: string;
    learner_code: string;
    grade: number;
    learner_profiles: { first_name: string; last_name: string } | null;
    risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null;
  };
}

interface Props {
  programId: string;
  enrolments: Enrolment[];
}

export default function EnrolmentManager({ programId, enrolments: initial }: Props) {
  const router                = useRouter();
  const [enrolments, setEnrolments] = useState(initial);
  const [removing,   setRemoving]   = useState<string | null>(null);
  // Add learner
  const [showAdd,    setShowAdd]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [results,    setResults]    = useState<any[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [enrolling,  setEnrolling]  = useState<string | null>(null);

  const enrolled = new Set(enrolments.map(e => e.learners?.learner_id));

  // ── Remove learner ────────────────────────────────────────────────────────
  const handleRemove = async (e: Enrolment) => {
    if (!confirm(`Remove ${e.learners?.learner_profiles?.first_name} from this programme?`)) return;
    setRemoving(e.enrollment_id);
    try {
      const res = await fetch('/api/v1/enrollments', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ learner_id: e.learners.learner_id, program_id: programId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEnrolments(prev => prev.filter(x => x.enrollment_id !== e.enrollment_id));
      toast.success('Learner removed from programme');
    } catch (err: any) {
      toast.error(err.message);
    } finally { setRemoving(null); }
  };

  // ── Search learners ───────────────────────────────────────────────────────
  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/learners?search=${encodeURIComponent(q)}&limit=10`);
      const json = await res.json();
      setResults(json.data || []);
    } finally { setSearching(false); }
  };

  // ── Enrol learner ─────────────────────────────────────────────────────────
  const handleEnrol = async (learner: any) => {
    setEnrolling(learner.learner_id);
    try {
      const res = await fetch('/api/v1/enrollments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ learner_id: learner.learner_id, program_id: programId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`${learner.full_name} enrolled`);
      setSearch(''); setResults([]); setShowAdd(false);
      router.refresh(); // reload server component data
    } catch (err: any) {
      toast.error(err.message);
    } finally { setEnrolling(null); }
  };

  const thSt: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
    borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
  };

  const riskCol = (r: string) =>
    r === 'high' ? 'var(--ds-danger)' : r === 'medium' ? 'var(--ds-warn)' : 'var(--ds-success)';

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold" style={{ color: DS.text }}>
          Enrolled Learners ({enrolments.length})
        </h2>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer">
          {showAdd ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {showAdd ? 'Cancel' : 'Enrol Learner'}
        </button>
      </div>

      {/* Add learner panel */}
      {showAdd && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: DS.surface, border: `1px solid ${DS.primaryBorder}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>
            Search for a learner to enrol
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: DS.textMuted }} />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name or learner code…"
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                background: DS.surfaceHover as string, color: DS.text as string,
                border: `1px solid ${DS.border}`, borderRadius: 10, fontSize: 13, outline: 'none',
              }}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                style={{ color: DS.textMuted }} />
            )}
          </div>

          {results.length > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${DS.border}` }}>
              {results.map((l: any) => {
                const alreadyIn = enrolled.has(l.learner_id);
                return (
                  <div key={l.learner_id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: `1px solid ${DS.borderLight}`, background: DS.surface }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: DS.text }}>{l.full_name}</p>
                      <p className="text-xs font-mono" style={{ color: DS.textMuted }}>
                        {l.learner_code} · Grade {l.grade}
                      </p>
                    </div>
                    {alreadyIn ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
                        ✓ Enrolled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnrol(l)}
                        disabled={enrolling === l.learner_id}
                        className="btn-primary text-xs py-1.5 cursor-pointer disabled:opacity-50">
                        {enrolling === l.learner_id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : 'Enrol'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {search.length >= 2 && !searching && results.length === 0 && (
            <p className="text-sm text-center py-2" style={{ color: DS.textMuted }}>No learners found</p>
          )}
        </div>
      )}

      {/* Enrolments table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Code','Name','Grade','Attendance','Avg Score','Risk',''].map(h => (
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enrolments.map(e => {
              const l    = e.learners;
              const risk = l?.risk_scores;
              const isRemoving = removing === e.enrollment_id;
              return (
                <tr key={e.enrollment_id}
                  style={{ borderBottom: `1px solid ${DS.borderLight}`, opacity: isRemoving ? 0.5 : 1 }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: DS.textMuted }}>
                    {l?.learner_code}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/learners/${l?.learner_id}`}
                      className="font-medium hover:underline" style={{ color: DS.text }}>
                      {l?.learner_profiles?.first_name} {l?.learner_profiles?.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: DS.textMid }}>
                    Gr {l?.grade}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold"
                    style={{ color: (risk?.attendance_rate || 0) < 75 ? 'var(--ds-danger)' : DS.text as string }}>
                    {risk ? `${Math.floor(risk.attendance_rate)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold"
                    style={{ color: (risk?.avg_score || 0) < 50 ? 'var(--ds-danger)' : DS.text as string }}>
                    {risk ? `${Math.round(risk.avg_score)}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {risk && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{ color: riskCol(risk.risk_level), background: `${riskCol(risk.risk_level)}20` }}>
                        {risk.risk_level}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemove(e)}
                      disabled={isRemoving}
                      title="Remove from programme"
                      className="p-1.5 rounded-lg cursor-pointer opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20"
                      style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
                      {isRemoving
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!enrolments.length && (
          <div className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>
            No active enrolments yet. Click &ldquo;Enrol Learner&rdquo; above to add learners.
          </div>
        )}
      </div>
    </div>
  );
}
