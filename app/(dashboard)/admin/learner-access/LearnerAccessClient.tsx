'use client';
import { useState, useMemo } from 'react';
import { Search, Printer, CheckCircle2, Clock, Filter, X, ExternalLink, Copy } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import { toast } from 'sonner';

interface Learner {
  learner_id:   string;
  learner_code: string;
  full_name:    string;
  grade:        number;
  school:       string;
  registered:   boolean;
  reg_url:      string;
}

interface Props {
  learners: Learner[];
  baseUrl:  string;
}

const thSt: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
};

export default function LearnerAccessClient({ learners, baseUrl }: Props) {
  const [search,     setSearch]     = useState('');
  const [schoolF,    setSchoolF]    = useState('');
  const [gradeF,     setGradeF]     = useState('');
  const [statusF,    setStatusF]    = useState<'all'|'registered'|'pending'>('all');

  const schools = useMemo(() => Array.from(new Set(learners.map(l => l.school))).sort(), [learners]);
  const grades  = useMemo(() => Array.from(new Set(learners.map(l => l.grade))).sort((a,b)=>a-b), [learners]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return learners.filter(l => {
      if (q && !l.full_name.toLowerCase().includes(q) && !l.learner_code.toLowerCase().includes(q)) return false;
      if (schoolF && l.school !== schoolF) return false;
      if (gradeF  && String(l.grade) !== gradeF) return false;
      if (statusF === 'registered' && !l.registered)  return false;
      if (statusF === 'pending'    && l.registered)    return false;
      return true;
    });
  }, [learners, search, schoolF, gradeF, statusF]);

  const registered = learners.filter(l => l.registered).length;
  const pending    = learners.length - registered;

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  const handlePrint = () => window.print();

  const selectSt: React.CSSProperties = {
    background: DS.surfaceHover as string, color: DS.text as string,
    border: `1px solid ${DS.border}`, borderRadius: '10px',
    padding: '7px 10px', fontSize: '13px', outline: 'none',
  };

  return (
    <div className="space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Learners',    value: learners.length, color: DS.primary,          sub: 'in database' },
          { label: 'Registered',        value: registered,      color: 'var(--ds-success)',  sub: `${learners.length ? Math.round(registered/learners.length*100) : 0}% complete` },
          { label: 'Not Yet Registered',value: pending,         color: pending > 0 ? 'var(--ds-warn)' : 'var(--ds-success)', sub: 'need registration link' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: DS.textMuted }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: DS.textMuted }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or code…" className="form-input pl-9 w-full text-sm" />
          {search && <button aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
            <X className="w-3.5 h-3.5" style={{ color: DS.textMuted }} />
          </button>}
        </div>

        <select value={schoolF} onChange={e => setSchoolF(e.target.value)} style={{ ...selectSt, width: '180px' }}>
          <option value="">All schools</option>
          {schools.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={gradeF} onChange={e => setGradeF(e.target.value)} style={{ ...selectSt, width: '120px' }}>
          <option value="">All grades</option>
          {grades.map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
        </select>

        <div className="flex gap-1 p-1 rounded-xl" style={{ background: DS.surfaceHover }}>
          {(['all','registered','pending'] as const).map(s => (
            <button key={s} onClick={() => setStatusF(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer"
              style={statusF === s
                ? { background: DS.primary, color: '#fff' }
                : { background: 'transparent', color: DS.textMid as string }}>
              {s === 'all' ? 'All' : s === 'registered' ? '✓ Registered' : '⏳ Pending'}
            </button>
          ))}
        </div>

        <span className="text-xs ml-auto" style={{ color: DS.textMuted }}>{filtered.length} learners</span>

        <button onClick={handlePrint}
          className="btn-primary text-sm no-print">
          <Printer className="w-4 h-4" /> Print Sheet
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Learner','Code','Grade','School','Status','Registration Link',''].map(h => (
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.learner_id} className="tr-hover"
                style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                <td className="px-4 py-3 font-semibold" style={{ color: DS.text }}>{l.full_name}</td>
                <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: DS.primary }}>{l.learner_code}</td>
                <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>Grade {l.grade}</td>
                <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{l.school}</td>
                <td className="px-4 py-3">
                  {l.registered
                    ? <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--ds-success)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                      </span>
                    : <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--ds-warn)' }}>
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                  }
                </td>
                <td className="px-4 py-3">
                  {!l.registered && (
                    <span className="text-xs font-mono truncate max-w-[200px] block" style={{ color: DS.textMuted }}>
                      /register?code={l.learner_code}
                    </span>
                  )}
                  {l.registered && (
                    <span className="text-xs" style={{ color: DS.borderLight }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!l.registered && (
                    <div className="flex gap-2">
                      <button onClick={() => copyUrl(l.reg_url)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <a href={l.reg_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                        style={{ background: DS.surfaceHover as string, color: DS.textMid as string, border: `1px solid ${DS.border}` }}>
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: DS.textMuted }}>
                  No learners match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── PRINT VIEW ─── hidden on screen, shown only when printing ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .print-sheet { display: block !important; }
        }
        @media screen { .print-sheet { display: none; } }
      `}</style>

      <div className="print-sheet">
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '16px' }}>

          {/* Print header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #7C3AED' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0 }}>Girls in STEM</h1>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Learner Registration Sheet</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
              <div>Printed: {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div style={{ marginTop: '2px' }}>{filtered.filter(l => !l.registered).length} learners need to register</div>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '11px', color: '#5B21B6' }}>
            <strong>Instructions for learners:</strong> Open the registration link on your phone or computer.
            Enter your name, email address, and choose a password. Your learner code is already pre-filled.
            After registering, go to <strong>{baseUrl}/login</strong> to sign in.
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#0F172A', color: 'white' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Learner Name</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grade</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Registration Link</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Done ✓</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.learner_id} style={{ borderBottom: '1px solid #E2E8F0', background: l.registered ? '#F0FDF4' : (i % 2 === 0 ? '#fff' : '#FAFAFA') }}>
                  <td style={{ padding: '7px 10px', color: '#94A3B8' }}>{i + 1}</td>
                  <td style={{ padding: '7px 10px', fontWeight: '600', color: '#0F172A' }}>
                    {l.full_name}
                    {l.registered && <span style={{ marginLeft: '6px', fontSize: '9px', background: '#DCFCE7', color: '#16A34A', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>Registered</span>}
                  </td>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: '700', color: '#7C3AED' }}>{l.learner_code}</td>
                  <td style={{ padding: '7px 10px', color: '#475569' }}>Gr {l.grade}</td>
                  <td style={{ padding: '7px 10px', color: '#2563EB', fontSize: '10px', fontFamily: 'monospace' }}>
                    {l.registered ? '—' : l.reg_url}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '1.5px solid #CBD5E1', borderRadius: '3px' }}></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94A3B8' }}>
            <span>Girls in STEM Digital Platform — Confidential</span>
            <span>Sign-in URL: {baseUrl}/login</span>
          </div>
        </div>
      </div>

    </div>
  );
}
