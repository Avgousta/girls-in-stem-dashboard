'use client';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, AlertTriangle, CheckCircle2, Download, Loader2, X } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

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

const CSV_TEMPLATE = [
  'first_name,last_name,grade,school_id,program_id,email,phone,parent_name,parent_contact,enrollment_date',
  'Nomvula,Dlamini,10,SCHOOL-UUID-HERE,PROGRAM-UUID-HERE,nomvula@school.edu.za,0821234567,Thandi Dlamini,0831234567,' + TODAY,
  'Ayanda,Nkosi,11,SCHOOL-UUID-HERE,PROGRAM-UUID-HERE,,,,,'+TODAY,
].join('\n');

const thSt: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
};

export default function BulkImportClient({ schools, programs }: Props) {
  const [tab,       setTab]       = useState<'upload'|'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [rows,      setRows]      = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState<{created:number;failed:number;errors:string[]}|null>(null);
  const [drag,      setDrag]      = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): ParsedRow[] {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers   = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''));
    const dataLines = lines.slice(1);

    return dataLines.map((line, i) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const get = (col: string) => values[headers.indexOf(col)] || '';
      const row: ParsedRow = {
        row: i + 2, first_name: get('first_name'), last_name: get('last_name'),
        grade: get('grade'), school_id: get('school_id'), program_id: get('program_id'),
        email: get('email'), phone: get('phone'), parent_name: get('parent_name'),
        parent_contact: get('parent_contact'), enrollment_date: get('enrollment_date') || TODAY,
        errors: [],
      };
      if (!row.first_name)  row.errors.push('First name required');
      if (!row.last_name)   row.errors.push('Last name required');
      if (!row.grade || isNaN(Number(row.grade)) || Number(row.grade) < 8 || Number(row.grade) > 12)
        row.errors.push('Grade must be 8–12');
      if (!row.school_id)   row.errors.push('school_id required');
      if (!row.program_id)  row.errors.push('program_id required');
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row.errors.push('Invalid email');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.enrollment_date)) row.errors.push('Date must be YYYY-MM-DD');
      if (row.school_id  && !schools.find(s => s.school_id  === row.school_id))  row.errors.push(`Unknown school_id: ${row.school_id}`);
      if (row.program_id && !programs.find(p => p.program_id === row.program_id)) row.errors.push(`Unknown program_id: ${row.program_id}`);
      return row;
    });
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') { toast.error('Please upload a .csv file'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = parseCSV(e.target?.result as string);
      setRows(parsed); setResult(null);
      toast.success(`Parsed ${parsed.length} rows`);
    };
    reader.readAsText(file);
  }

  function handleParse() {
    const parsed = parseCSV(pasteText);
    setRows(parsed); setResult(null);
    if (parsed.length === 0) toast.error('No data found — make sure first row is headers');
    else toast.success(`Parsed ${parsed.length} rows`);
  }

  function downloadTemplate() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }));
    a.download = 'learner_import_template.csv'; a.click();
  }

  function downloadIdReference() {
    const lines = [
      'SCHOOLS','school_id,school_name',...schools.map(s => `${s.school_id},${s.school_name}`),
      '','PROGRAMMES','program_id,program_name',...programs.map(p => `${p.program_id},${p.program_name}`),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = 'schools_and_programmes_ids.csv'; a.click();
  }

  async function handleImport() {
    const valid = rows.filter(r => r.errors.length === 0);
    if (valid.length === 0) { toast.error('No valid rows to import'); return; }
    setImporting(true);
    try {
      const res = await fetch('/api/v1/learners/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learners: valid.map(r => ({
          first_name: r.first_name, last_name: r.last_name, grade: Number(r.grade),
          school_id: r.school_id, program_id: r.program_id,
          email: r.email || undefined, phone: r.phone || undefined,
          parent_name: r.parent_name || undefined, parent_contact: r.parent_contact || undefined,
          enrollment_date: r.enrollment_date,
        })) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.data);
      if (json.data.created > 0) { toast.success(`✓ ${json.data.created} learners imported successfully`); setRows([]); setPasteText(''); }
      if (json.data.failed  > 0) toast.error(`${json.data.failed} rows failed — see details below`);
    } catch (e: any) { toast.error(e.message || 'Import failed'); }
    finally { setImporting(false); }
  }

  const validCount   = rows.filter(r => r.errors.length === 0).length;
  const invalidCount = rows.filter(r => r.errors.length  > 0).length;

  return (
    <div className="space-y-5">

      {/* Help bar */}
      <div className="rounded-2xl p-4 flex items-start gap-3 flex-wrap"
        style={{ background: DS.primaryLight, border: `1px solid ${DS.primaryBorder}` }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1" style={{ color: DS.primary }}>How to use bulk import</p>
          <p className="text-xs leading-relaxed" style={{ color: DS.primary }}>
            1. Download the CSV template and ID reference below.&nbsp;
            2. Fill in the spreadsheet using the school and programme IDs from the reference file.&nbsp;
            3. Save as CSV and upload — or paste the CSV text directly.&nbsp;
            4. Review the preview, fix any errors, then click Import.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={downloadTemplate} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <button onClick={downloadIdReference} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" /> IDs Reference
          </button>
        </div>
      </div>

      {/* Input tabs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex" style={{ borderBottom: `1px solid ${DS.border}` }}>
          {(['upload','paste'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-3 text-sm font-medium capitalize transition-colors cursor-pointer"
              style={tab === t
                ? { color: DS.primary, borderBottom: `2px solid ${DS.primary}`, background: DS.primaryLight }
                : { color: DS.textMuted as string, borderBottom: '2px solid transparent' }}>
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
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
              style={{
                borderColor: drag ? DS.primary as string : DS.border,
                background:  drag ? DS.primaryLight as string : DS.surfaceHover as string,
              }}>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />
              <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: DS.borderLight }} />
              <p className="font-medium" style={{ color: DS.textMid }}>Drop your CSV file here or click to browse</p>
              <p className="text-xs mt-1" style={{ color: DS.textMuted }}>.csv files only · max 200 learners</p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder={`Paste CSV here — first row must be headers:\nfirst_name,last_name,grade,school_id,program_id,...`}
                rows={8} className="form-input w-full font-mono text-xs resize-none" />
              <button onClick={handleParse} className="btn-primary text-sm">
                <FileText className="w-4 h-4" /> Parse CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3"
            style={{ borderBottom: `1px solid ${DS.border}` }}>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold" style={{ color: DS.text }}>Preview — {rows.length} rows</h2>
              {validCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
                  <CheckCircle2 className="w-3 h-3" /> {validCount} valid
                </span>
              )}
              {invalidCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
                  <AlertTriangle className="w-3 h-3" /> {invalidCount} errors
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRows([]); setPasteText(''); setResult(null); }}
                className="btn-secondary text-xs">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
              <button onClick={handleImport} disabled={importing || validCount === 0} className="btn-primary text-sm">
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import {validCount} Learners</>}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['#','Status','First Name','Last Name','Grade','School','Programme','Email','Enroll Date'].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.row}
                    style={{
                      borderBottom: `1px solid ${DS.borderLight}`,
                      background: r.errors.length > 0 ? 'var(--ds-danger-light)' : 'transparent',
                    }}>
                    <td className="px-3 py-2 font-mono" style={{ color: DS.textMuted }}>{r.row}</td>
                    <td className="px-3 py-2">
                      {r.errors.length === 0
                        ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>✓ OK</span>
                        : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}
                            title={r.errors.join('\n')}>
                            ✗ {r.errors.length} error{r.errors.length > 1 ? 's' : ''}
                          </span>}
                    </td>
                    <td className="px-3 py-2 font-medium" style={{ color: r.first_name ? DS.text as string : 'var(--ds-danger)' }}>
                      {r.first_name || '⚠ missing'}
                    </td>
                    <td className="px-3 py-2" style={{ color: r.last_name ? DS.textMid as string : 'var(--ds-danger)' }}>
                      {r.last_name || '⚠ missing'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: DS.textMid }}>{r.grade}</td>
                    <td className="px-3 py-2" style={{ color: DS.textMuted }}>
                      {schools.find(s => s.school_id === r.school_id)?.school_name
                        || <span style={{ color: 'var(--ds-danger)' }}>{r.school_id || '⚠ missing'}</span>}
                    </td>
                    <td className="px-3 py-2" style={{ color: DS.textMuted }}>
                      {programs.find(p => p.program_id === r.program_id)?.program_name
                        || <span style={{ color: 'var(--ds-danger)' }}>{r.program_id || '⚠ missing'}</span>}
                    </td>
                    <td className="px-3 py-2" style={{ color: DS.textMuted }}>{r.email || '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: DS.textMuted }}>{r.enrollment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.some(r => r.errors.length > 0) && (
            <div className="px-5 py-4" style={{ borderTop: `1px solid ${DS.border}`, background: 'var(--ds-danger-light)' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--ds-danger)' }}>
                <AlertTriangle className="w-3.5 h-3.5" /> Rows with errors will be skipped. Fix your CSV and re-upload to include them.
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {rows.filter(r => r.errors.length > 0).map(r => (
                  <p key={r.row} className="text-xs" style={{ color: 'var(--ds-danger)' }}>
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
        <div className="rounded-2xl p-5"
          style={result.failed === 0
            ? { background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }
            : { background: 'var(--ds-warn-light)',    border: '1px solid var(--ds-warn)' }}>
          <div className="flex items-center gap-3 mb-3">
            {result.failed === 0
              ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--ds-success)' }} />
              : <AlertTriangle className="w-5 h-5" style={{ color: 'var(--ds-warn)' }} />}
            <h3 className="font-semibold" style={{ color: DS.text }}>Import Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="rounded-xl p-3" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--ds-success)' }}>{result.created}</p>
              <p className="text-xs" style={{ color: DS.textMuted }}>learners imported</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <p className="text-2xl font-bold" style={{ color: result.failed > 0 ? 'var(--ds-danger)' : DS.borderLight as string }}>{result.failed}</p>
              <p className="text-xs" style={{ color: DS.textMuted }}>failed</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs" style={{ color: 'var(--ds-danger)' }}>{e}</p>
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

      {/* ID Reference tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[
          { title: 'School IDs', colLabel: 'school_id (copy this)', items: schools, idKey: 'school_id' as const, nameKey: 'school_name' as const },
          { title: 'Programme IDs', colLabel: 'program_id (copy this)', items: programs, idKey: 'program_id' as const, nameKey: 'program_name' as const },
        ].map(({ title, colLabel, items, idKey, nameKey }) => (
          <div key={title} className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: DS.text }}>{title}</h3>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th style={{ ...thSt, padding: '4px 0 8px' }}>Name</th>
                  <th style={{ ...thSt, padding: '4px 0 8px' }}>{colLabel}</th>
                </tr>
              </thead>
              <tbody>
                {(items as any[]).map(s => (
                  <tr key={s[idKey]} style={{ borderTop: `1px solid ${DS.borderLight}` }}>
                    <td className="py-1.5 pr-3" style={{ color: DS.textMid }}>{s[nameKey]}</td>
                    <td className="py-1.5 font-mono select-all" style={{ color: DS.primary }}>{s[idKey]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

    </div>
  );
}
