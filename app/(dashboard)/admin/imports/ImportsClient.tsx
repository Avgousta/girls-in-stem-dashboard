'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Loader2,
  ChevronRight, X, Download, RotateCcw,
} from 'lucide-react';
import { fmt } from '@/utils';
import type { ImportJob } from './page';

interface Programme { program_id: string; program_name: string }

type Step = 'upload' | 'map' | 'preview' | 'result';

interface ParsedCSV {
  headers: string[];
  rows:    Record<string, string>[];
  raw:     string;
}

// ── CSV parser (handles quoted fields) ───────────────────────────────────────
function parseCSV(text: string): ParsedCSV {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [], raw: text };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseRow(l);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });

  return { headers, rows, raw: text };
}

// ── Template download ────────────────────────────────────────────────────────
function downloadTemplate() {
  const csv = [
    'learner_code,subject,score,max_score,assessment_date,term,assessment_type',
    'LRN001,Mathematics,72,100,2026-06-15,2,test',
    'LRN002,Mathematics,85,100,2026-06-15,2,test',
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'import_template.csv';
  a.click();
}

// ── Step 1: Upload ────────────────────────────────────────────────────────────
function UploadStep({ onParsed }: { onParsed: (d: ParsedCSV, name: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [error,    setError]    = useState('');

  const process = (file: File) => {
    setError('');
    if (!file.name.match(/\.(csv|txt)$/i)) {
      setError('Please upload a CSV file. Excel files (.xlsx) should be exported as CSV first.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.headers.length < 2) { setError('Could not detect columns. Check the file has a header row.'); return; }
      if (parsed.rows.length === 0)  { setError('No data rows found.'); return; }
      onParsed(parsed, file.name);
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="rounded-2xl border-2 border-dashed p-12 text-center transition-all"
        style={{ borderColor: dragging ? DS.primary as string : DS.border as string, background: dragging ? DS.primaryLight as string : DS.surface as string }}>
        <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: DS.primary }} />
        <p className="text-sm font-semibold mb-1" style={{ color: DS.text }}>Drop CSV file here</p>
        <p className="text-xs mb-4" style={{ color: DS.textMuted }}>or click to browse</p>
        <label className="cursor-pointer">
          <input type="file" accept=".csv,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) process(f); }} />
          <span className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: DS.primary, color: '#fff' }}>
            Choose File
          </span>
        </label>
      </div>
      {error && (
        <div className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'var(--ds-danger-light)', border: '1px solid var(--ds-danger)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-danger)' }} />
          <p className="text-sm" style={{ color: 'var(--ds-danger)' }}>{error}</p>
        </div>
      )}
      <div className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: DS.surfaceHover }}>
        <FileText className="w-5 h-5 shrink-0" style={{ color: DS.textMuted }} />
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: DS.textMid }}>Need a template?</p>
          <p className="text-xs" style={{ color: DS.textMuted }}>Download our CSV template with the expected column format.</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: DS.primaryLight, color: DS.primary }}>
          <Download className="w-3 h-3" /> Template
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Column mapping ────────────────────────────────────────────────────
interface Mapping {
  program_id: string; source_type: string;
  col_identifier: string; col_subject: string; col_score: string;
  col_max_score: string; col_date: string; col_term: string; col_type: string;
  default_max_score: number; default_type: string;
  default_term: string; default_date: string;
}

function MappingStep({ headers, programmes, mapping, setMapping, onNext, onBack }: {
  headers: string[]; programmes: Programme[];
  mapping: Mapping; setMapping: (m: Mapping) => void;
  onNext: () => void; onBack: () => void;
}) {
  const sel = (label: string, key: keyof Mapping, required?: boolean) => (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>
        {label}{required && <span style={{ color: 'var(--ds-danger)' }}> *</span>}
      </label>
      <select
        value={mapping[key] as string}
        onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
        className="form-select w-full text-sm">
        {!required && <option value="">— not in file —</option>}
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );

  const canProceed = mapping.program_id && mapping.col_identifier && mapping.col_subject && mapping.col_score;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 space-y-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <p className="text-sm font-bold" style={{ color: DS.text }}>1. Select programme</p>
        <select value={mapping.program_id} onChange={e => setMapping({ ...mapping, program_id: e.target.value })}
          className="form-select w-full text-sm">
          <option value="">Choose programme…</option>
          {programmes.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
        </select>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Source type</label>
          <select value={mapping.source_type} onChange={e => setMapping({ ...mapping, source_type: e.target.value })}
            className="form-select w-full text-sm">
            <option value="generic">Generic CSV</option>
            <option value="siyavula">Siyavula export</option>
            <option value="greenbook">GreenBook export</option>
            <option value="excel">Excel export</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <p className="text-sm font-bold" style={{ color: DS.text }}>2. Map columns from your file</p>
        <div className="grid grid-cols-2 gap-3">
          {sel('Learner identifier (code or name)', 'col_identifier', true)}
          {sel('Subject', 'col_subject', true)}
          {sel('Score', 'col_score', true)}
          {sel('Max score', 'col_max_score')}
          {sel('Assessment date', 'col_date')}
          {sel('Term (1–4)', 'col_term')}
          {sel('Assessment type', 'col_type')}
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <p className="text-sm font-bold" style={{ color: DS.text }}>3. Defaults (used when column not in file)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Max score</label>
            <input type="number" value={mapping.default_max_score}
              onChange={e => setMapping({ ...mapping, default_max_score: Number(e.target.value) })}
              className="form-input w-full text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Term</label>
            <select value={mapping.default_term} onChange={e => setMapping({ ...mapping, default_term: e.target.value })}
              className="form-select w-full text-sm">
              <option value="">None</option>
              {[1,2,3,4].map(t => <option key={t} value={t}>Term {t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Date (YYYY-MM-DD)</label>
            <input type="date" value={mapping.default_date}
              onChange={e => setMapping({ ...mapping, default_date: e.target.value })}
              className="form-input w-full text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Type</label>
            <select value={mapping.default_type} onChange={e => setMapping({ ...mapping, default_type: e.target.value })}
              className="form-select w-full text-sm">
              {['test','quiz','assignment','practical','oral','project','other'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
          style={{ background: DS.surfaceHover, color: DS.textMid }}>
          ← Back
        </button>
        <button onClick={onNext} disabled={!canProceed}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: DS.primary, color: '#fff', opacity: !canProceed ? 0.5 : 1 }}>
          Preview Import <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Preview ───────────────────────────────────────────────────────────
function PreviewStep({ rows, mapping, onConfirm, onBack, importing }: {
  rows: Record<string, string>[]; mapping: Mapping;
  onConfirm: () => void; onBack: () => void; importing: boolean;
}) {
  const preview = rows.slice(0, 8);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <p className="text-sm font-bold mb-1" style={{ color: DS.text }}>
          Ready to import {rows.length} row{rows.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs" style={{ color: DS.textMuted }}>
          Showing first {Math.min(8, rows.length)} rows. Unmatched learners will be skipped.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: DS.surfaceHover }}>
                {[mapping.col_identifier, mapping.col_subject, mapping.col_score,
                  mapping.col_max_score, mapping.col_date, mapping.col_term
                ].filter(Boolean).map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-wider"
                    style={{ color: DS.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${DS.borderLight}` }}>
                  {[mapping.col_identifier, mapping.col_subject, mapping.col_score,
                    mapping.col_max_score, mapping.col_date, mapping.col_term
                  ].filter(Boolean).map(h => (
                    <td key={h} className="px-3 py-2" style={{ color: DS.text }}>{row[h] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length > 8 && (
        <p className="text-xs text-center" style={{ color: DS.textMuted }}>
          …and {rows.length - 8} more rows
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={importing}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
          style={{ background: DS.surfaceHover, color: DS.textMid }}>
          ← Back
        </button>
        <button onClick={onConfirm} disabled={importing}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: DS.primary, color: '#fff', opacity: importing ? 0.7 : 1 }}>
          {importing
            ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</>
            : <><Upload className="w-4 h-4" />Confirm Import ({rows.length} rows)</>}
        </button>
      </div>
    </div>
  );
}

// ── Job history ───────────────────────────────────────────────────────────────
function JobHistory({ jobs }: { jobs: ImportJob[] }) {
  if (!jobs.length) return null;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <p className="text-xs font-bold uppercase tracking-wider px-5 py-4"
        style={{ color: DS.textMuted, borderBottom: `1px solid ${DS.border}` }}>
        Import History
      </p>
      <div className="divide-y" style={{ '--tw-divide-color': DS.borderLight } as React.CSSProperties}>
        {jobs.map(j => (
          <div key={j.job_id} className="px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: j.status === 'complete' ? 'var(--ds-success-light)' : 'var(--ds-danger-light)' }}>
              {j.status === 'complete'
                ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ds-success)' }} />
                : <AlertTriangle className="w-4 h-4" style={{ color: 'var(--ds-danger)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: DS.text }}>{j.source_name}</p>
              <p className="text-xs" style={{ color: DS.textMuted }}>
                {j.programs?.program_name ?? '—'} · {fmt.date(j.created_at)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--ds-success)' }}>
                {j.rows_imported} imported
              </p>
              {j.rows_skipped > 0 && (
                <p className="text-xs tabular-nums" style={{ color: 'var(--ds-warn)' }}>
                  {j.rows_skipped} skipped
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ImportsClient({ programmes, initialJobs }: { programmes: Programme[]; initialJobs: ImportJob[] }) {
  const [step,      setStep]      = useState<Step>('upload');
  const [csvData,   setCsvData]   = useState<ParsedCSV | null>(null);
  const [fileName,  setFileName]  = useState('');
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [jobs,      setJobs]      = useState(initialJobs);

  const [mapping, setMapping] = useState<Mapping>({
    program_id: programmes[0]?.program_id ?? '',
    source_type: 'generic',
    col_identifier: '', col_subject: '', col_score: '',
    col_max_score: '', col_date: '', col_term: '', col_type: '',
    default_max_score: 100, default_type: 'test',
    default_term: '', default_date: '',
  });

  const onParsed = (d: ParsedCSV, name: string) => {
    setCsvData(d);
    setFileName(name);
    // Auto-detect common column names
    const h = d.headers.map(x => x.toLowerCase());
    const find = (...keys: string[]) => d.headers.find((_, i) => keys.some(k => h[i].includes(k))) ?? '';
    setMapping(m => ({
      ...m,
      col_identifier: find('code','learner','student','name','id'),
      col_subject:    find('subject','topic','course','module'),
      col_score:      find('score','mark','result','grade','obtained','got'),
      col_max_score:  find('max','total','out of','maximum'),
      col_date:       find('date','when','assessed'),
      col_term:       find('term','quarter','period'),
      col_type:       find('type','kind','category','assessment'),
    }));
    setStep('map');
  };

  const doImport = async () => {
    if (!csvData || !mapping.program_id) return;
    setImporting(true);
    try {
      const res = await fetch('/api/v1/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mapping,
          source_name: fileName,
          default_term: mapping.default_term ? parseInt(mapping.default_term) : null,
          rows: csvData.rows,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.data);
      setStep('result');
      // Refresh job list
      const r = await fetch('/api/v1/imports');
      const rj = await r.json();
      if (rj.data) setJobs(rj.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep('upload'); setCsvData(null); setFileName(''); setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['upload','map','preview','result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: DS.textMuted }} />}
            <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full"
              style={step === s
                ? { background: DS.primary, color: '#fff' }
                : { background: DS.surfaceHover, color: step === 'result' || ['upload','map','preview'].indexOf(step) > i ? DS.textMid as string : DS.textMuted as string }}>
              {s}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 'upload' && <UploadStep onParsed={onParsed} />}

      {step === 'map' && csvData && (
        <MappingStep
          headers={csvData.headers}
          programmes={programmes}
          mapping={mapping}
          setMapping={setMapping}
          onNext={() => setStep('preview')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'preview' && csvData && (
        <PreviewStep
          rows={csvData.rows}
          mapping={mapping}
          onConfirm={doImport}
          onBack={() => setStep('map')}
          importing={importing}
        />
      )}

      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="rounded-2xl p-8 text-center space-y-3"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: 'var(--ds-success)' }} />
            <h2 className="text-xl font-black" style={{ color: DS.text }}>Import Complete</h2>
            <div className="flex justify-center gap-6 pt-2">
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: 'var(--ds-success)' }}>{result.imported}</p>
                <p className="text-xs" style={{ color: DS.textMuted }}>Records imported</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: result.skipped > 0 ? 'var(--ds-warn)' : DS.textMuted as string }}>{result.skipped}</p>
                <p className="text-xs" style={{ color: DS.textMuted }}>Skipped (unmatched)</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: DS.text }}>{result.total}</p>
                <p className="text-xs" style={{ color: DS.textMuted }}>Total rows</p>
              </div>
            </div>
            {result.skipped > 0 && (
              <p className="text-xs mt-2" style={{ color: DS.textMuted }}>
                Skipped rows had no matching learner code or name. Check that learner codes match the LRN format.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              style={{ background: DS.primaryLight, color: DS.primary }}>
              <RotateCcw className="w-4 h-4" /> Import Another File
            </button>
            <a href="/assessments"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center cursor-pointer"
              style={{ background: DS.surfaceHover, color: DS.textMid }}>
              View Assessments
            </a>
          </div>
        </div>
      )}

      <JobHistory jobs={jobs} />
    </div>
  );
}
