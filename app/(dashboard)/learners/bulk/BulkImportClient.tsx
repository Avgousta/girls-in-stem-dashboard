'use client';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, AlertTriangle, CheckCircle2, Download, Loader2, X, RefreshCw } from 'lucide-react';
import { cn } from '@/utils';

interface School   { school_id: string; school_name: string }
interface Program  { program_id: string; program_name: string }
interface Props    { schools: School[]; programs: Program[] }

interface ParsedRow {
  row:            number;
  first_name:     string;
  last_name:      string;
  grade:          string;
  school_id:      string;
  program_id:     string;
  email:          string;
  phone:          string;
  parent_name:    string;
  parent_contact: string;
  enrollment_date:string;
  errors:         string[];
}

const TODAY = new Date().toISOString().slice(0, 10);

const REQUIRED_COLS = ['first_name','last_name','grade','school_id','program_id','enrollment_date'];

const CSV_TEMPLATE = [
  'first_name,last_name,grade,school_id,program_id,email,phone,parent_name,parent_contact,enrollment_date',
  'Nomvula,Dlamini,10,SCHOOL-UUID-HERE,PROGRAM-UUID-HERE,nomvula@school.edu.za,0821234567,Thandi Dlamini,0831234567,' + TODAY,
  'Ayanda,Nkosi,11,SCHOOL-UUID-HERE,PROGRAM-UUID-HERE,,,,,'+TODAY,
].join('\n');

export default function BulkImportClient({ schools, programs }: Props) {
  const [tab, setTab]           = useState<'upload'|'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [rows, setRows]         = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<{created:number;failed:number;errors:string[]}|null>(null);
  const [drag, setDrag]         = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  // ── CSV Parsing ───────────────────────────────────────────────────────────
  function parseCSV(text: string): ParsedRow[] {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''));
    const dataLines = lines.slice(1);

    return dataLines.map((line, i) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const get = (col: string) => values[headers.indexOf(col)] || '';

      const row: ParsedRow = {
        row:            i + 2,
        first_name:     get('first_name'),
        last_name:      get('last_name'),
        grade:          get('grade'),
        school_id:      get('school_id'),
        program_id:     get('program_id'),
        email:          get('email'),
        phone:          get('phone'),
        parent_name:    get('parent_name'),
        parent_contact: get('parent_contact'),
        enrollment_date:get('enrollment_date') || TODAY,
        errors:         [],
      };

      // Validate
      if (!row.first_name)  row.errors.push('First name required');
      if (!row.last_name)   row.errors.push('Last name required');
      if (!row.grade || isNaN(Number(row.grade)) || Number(row.grade) < 8 || Number(row.grade) > 12)
        row.errors.push('Grade must be 8–12');
      if (!row.school_id)   row.errors.push('school_id required');
      if (!row.program_id)  row.errors.push('program_id required');
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
        row.errors.push('Invalid email');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.enrollment_date))
        row.errors.push('Date must be YYYY-MM-DD');

      // Validate school_id and program_id are known
      if (row.school_id && !schools.find(s => s.school_id === row.school_id))
        row.errors.push(`Unknown school_id: ${row.school_id}`);
      if (row.program_id && !programs.find(p => p.program_id === row.program_id))
        row.errors.push(`Unknown program_id: ${row.program_id}`);

      return row;
    });
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setResult(null);
      toast.success(`Parsed ${parsed.length} rows`);
    };
    reader.readAsText(file);
  }

  function handleParse() {
    const parsed = parseCSV(pasteText);
    setRows(parsed);
    setResult(null);
    if (parsed.length === 0) toast.error('No data found — make sure first row is headers');
    else toast.success(`Parsed ${parsed.length} rows`);
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'learner_import_template.csv';
    a.click();
  }

  function downloadIdReference() {
    const lines = [
      'SCHOOLS',
      'school_id,school_name',
      ...schools.map(s => `${s.school_id},${s.school_name}`),
      '',
      'PROGRAMMES',
      'program_id,program_name',
      ...programs.map(p => `${p.program_id},${p.program_name}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'schools_and_programmes_ids.csv';
    a.click();
  }

  async function handleImport() {
    const valid = rows.filter(r => r.errors.length === 0);
    if (valid.length === 0) { toast.error('No valid rows to import'); return; }

    setImporting(true);
    try {
      const res = await fetch('/api/v1/learners/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learners: valid.map(r => ({
            first_name:      r.first_name,
            last_name:       r.last_name,
            grade:           Number(r.grade),
            school_id:       r.school_id,
            program_id:      r.program_id,
            email:           r.email   || undefined,
            phone:           r.phone   || undefined,
            parent_name:     r.parent_name    || undefined,
            parent_contact:  r.parent_contact || undefined,
            enrollment_date: r.enrollment_date,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.data);
      if (json.data.created > 0) {
        toast.success(`✓ ${json.data.created} learners imported successfully`);
        setRows([]);
        setPasteText('');
      }
      if (json.data.failed > 0) {
        toast.error(`${json.data.failed} rows failed — see details below`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const validCount   = rows.filter(r => r.errors.length === 0).length;
  const invalidCount = rows.filter(r => r.errors.length  > 0).length;

  return (
    <div className="space-y-5">

      {/* Help bar */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-800 mb-1">How to use bulk import</p>
          <p className="text-xs text-brand-700 leading-relaxed">
            1. Download the CSV template and ID reference below.&nbsp;
            2. Fill in the spreadsheet using the school and programme IDs from the reference file.&nbsp;
            3. Save as CSV and upload — or paste the CSV text directly.&nbsp;
            4. Review the preview, fix any errors, then click Import.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={downloadTemplate}
            className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <button onClick={downloadIdReference}
            className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" /> IDs Reference
          </button>
        </div>
      </div>

      {/* Input tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['upload','paste'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-3 text-sm font-medium capitalize transition-colors',
                tab === t ? 'text-brand-700 border-b-2 border-brand-700 bg-brand-50/50' : 'text-gray-500 hover:text-gray-700')}>
              {t === 'upload' ? '📁 Upload CSV' : '📋 Paste CSV'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'upload' ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f); }}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                drag ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
              )}>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">Drop your CSV file here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">.csv files only · max 200 learners</p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={`Paste CSV here — first row must be headers:\nfirst_name,last_name,grade,school_id,program_id,email,phone,parent_name,parent_contact,enrollment_date\nNomvula,Dlamini,10,uuid-here,uuid-here,,,,,2025-02-03`}
                rows={8}
                className="w-full form-input font-mono text-xs"
              />
              <button onClick={handleParse} className="btn-primary text-sm">
                <FileText className="w-4 h-4" /> Parse CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-800">Preview — {rows.length} rows</h2>
              {validCount > 0 && (
                <span className="badge bg-mint-400/10 text-mint-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> {validCount} valid
                </span>
              )}
              {invalidCount > 0 && (
                <span className="badge bg-red-50 text-red-700">
                  <AlertTriangle className="w-3 h-3 mr-1" /> {invalidCount} errors
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRows([]); setPasteText(''); setResult(null); }}
                className="btn-secondary text-xs">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="btn-primary text-sm">
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import {validCount} Learners</>}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  {['#','Status','First Name','Last Name','Grade','School','Programme','Email','Enroll Date'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.row} className={r.errors.length > 0 ? 'bg-red-50' : ''}>
                    <td className="text-xs text-gray-400 font-mono">{r.row}</td>
                    <td>
                      {r.errors.length === 0
                        ? <span className="badge bg-mint-400/10 text-mint-700 text-[10px]">✓ OK</span>
                        : <span className="badge bg-red-50 text-red-700 text-[10px]" title={r.errors.join('\n')}>
                            ✗ {r.errors.length} error{r.errors.length > 1 ? 's' : ''}
                          </span>}
                    </td>
                    <td className={!r.first_name ? 'text-red-500' : 'font-medium'}>{r.first_name || '⚠ missing'}</td>
                    <td className={!r.last_name  ? 'text-red-500' : ''}>{r.last_name  || '⚠ missing'}</td>
                    <td className="font-mono">{r.grade}</td>
                    <td className="text-xs text-gray-500">
                      {schools.find(s => s.school_id === r.school_id)?.school_name || <span className="text-red-500">{r.school_id || '⚠ missing'}</span>}
                    </td>
                    <td className="text-xs text-gray-500">
                      {programs.find(p => p.program_id === r.program_id)?.program_name || <span className="text-red-500">{r.program_id || '⚠ missing'}</span>}
                    </td>
                    <td className="text-xs text-gray-400">{r.email || '—'}</td>
                    <td className="text-xs text-gray-400 font-mono">{r.enrollment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Errors list */}
          {rows.some(r => r.errors.length > 0) && (
            <div className="px-5 py-4 border-t border-gray-100 bg-red-50">
              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Rows with errors will be skipped. Fix your CSV and re-upload to include them.
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {rows.filter(r => r.errors.length > 0).map(r => (
                  <p key={r.row} className="text-xs text-red-600">
                    <span className="font-mono font-semibold">Row {r.row}</span> ({r.first_name} {r.last_name}): {r.errors.join(' · ')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={cn('rounded-xl border p-5',
          result.failed === 0 ? 'bg-mint-400/5 border-mint-400/30' : 'bg-yellow-50 border-yellow-200')}>
          <div className="flex items-center gap-3 mb-3">
            {result.failed === 0
              ? <CheckCircle2 className="w-5 h-5 text-mint-600" />
              : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
            <h3 className="font-semibold text-gray-800">Import Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-white rounded-lg p-3 border border-mint-400/20">
              <p className="text-2xl font-bold text-mint-600">{result.created}</p>
              <p className="text-xs text-gray-500">learners imported</p>
            </div>
            <div className={cn('rounded-lg p-3 border', result.failed > 0 ? 'bg-white border-red-200' : 'bg-white border-gray-100')}>
              <p className={cn('text-2xl font-bold', result.failed > 0 ? 'text-red-600' : 'text-gray-300')}>{result.failed}</p>
              <p className="text-xs text-gray-500">failed</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}
          {result.created > 0 && (
            <a href="/learners" className="btn-primary text-sm mt-3 inline-flex">
              View Learners →
            </a>
          )}
        </div>
      )}

      {/* ID Reference table inline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">School IDs</h3>
          <table className="w-full text-xs">
            <thead><tr>
              <th className="text-left pb-2 text-gray-400 font-semibold uppercase text-[10px] tracking-wide">Name</th>
              <th className="text-left pb-2 text-gray-400 font-semibold uppercase text-[10px] tracking-wide">school_id (copy this)</th>
            </tr></thead>
            <tbody>{schools.map(s => (
              <tr key={s.school_id} className="border-t border-gray-50">
                <td className="py-1.5 pr-3 text-gray-700">{s.school_name}</td>
                <td className="py-1.5 font-mono text-brand-700 select-all">{s.school_id}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Programme IDs</h3>
          <table className="w-full text-xs">
            <thead><tr>
              <th className="text-left pb-2 text-gray-400 font-semibold uppercase text-[10px] tracking-wide">Name</th>
              <th className="text-left pb-2 text-gray-400 font-semibold uppercase text-[10px] tracking-wide">program_id (copy this)</th>
            </tr></thead>
            <tbody>{programs.map(p => (
              <tr key={p.program_id} className="border-t border-gray-50">
                <td className="py-1.5 pr-3 text-gray-700">{p.program_name}</td>
                <td className="py-1.5 font-mono text-brand-700 select-all">{p.program_id}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
