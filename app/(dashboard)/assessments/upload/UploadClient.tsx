'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Loader2, Upload, Download, Check, AlertTriangle, FileSpreadsheet, ArrowLeft, ArrowRight } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import {
  detectLayout, suggestMappings, buildLabel, yearForGrade, matchLearner, buildPreview, markKey,
  inferCurrentGrade, headerKey, learnerLabel, isCompleteMapping,
  type ColumnMapping, type LearnerRef, type MatchResult, type PreviewCell, type MarkKind,
} from '@/lib/marks-upload';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Program { program_id: string; program_name: string }
interface Context {
  learners: LearnerRef[];
  marks:    Array<{ learner_id: string; notes: string; score: number }>;
  mappings: Array<ColumnMapping & { header_key: string }>;
  aliases:  Array<{ alias_key: string; learner_id: string }>;
}
interface ColState { mapping: ColumnMapping | null; from: 'label' | 'remembered' | 'guess' | 'teacher' | null; year?: number }
type Step = 1 | 2 | 3 | 4;

// ── Styles (match the other assessment pages) ─────────────────────────────────
const card: React.CSSProperties  = { background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 16, padding: 20 };
const labelSt: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, color: DS.textMuted };
const selectSt: React.CSSProperties = { background: DS.surfaceHover, color: DS.text, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '7px 9px', fontSize: 13, outline: 'none' };
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: DS.textMuted, padding: '8px 10px', borderBottom: `1px solid ${DS.border}`, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: `1px solid ${DS.border}`, fontSize: 13, color: DS.text, verticalAlign: 'top' };

const STATUS_STYLE: Record<PreviewCell['status'], { bg: string; fg: string; label: string }> = {
  new:        { bg: DS.successLight, fg: DS.success, label: 'New' },
  changed:    { bg: DS.warnLight,    fg: DS.warn,    label: 'Changed' },
  suspicious: { bg: DS.dangerLight,  fg: DS.danger,  label: 'Check this' },
  invalid:    { bg: DS.dangerLight,  fg: DS.danger,  label: "Can't save" },
  unchanged:  { bg: DS.surfaceHover, fg: DS.textMuted, label: 'Unchanged' },
};
const REASON_TEXT: Record<string, string> = {
  outlier:        'Very different from this learner’s other marks in this subject',
  scale_mismatch: 'Doesn’t match the rest of the column (decimal vs percentage)',
  over_100:       'Over 100%',
  text:           'Not a number',
};

const KINDS: Array<{ v: MarkKind; label: string }> = [
  { v: 'term', label: 'Term mark' }, { v: 'baseline', label: 'Baseline' },
  { v: 'application', label: 'Application mark' }, { v: 'june_assignment', label: 'June assignment' },
  { v: 'ignore', label: 'Ignore column' },
];

const Badge = ({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) => (
  <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function UploadClient() {
  const [step, setStep]           = useState<Step>(1);
  const [programs, setPrograms]   = useState<Program[]>([]);
  const [programId, setProgramId] = useState('');
  const [ctx, setCtx]             = useState<Context | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(false);

  const [fileName, setFileName]   = useState('');
  const [workbook, setWorkbook]   = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState('');

  const [picks, setPicks]         = useState<Record<number, string | null>>({});   // row → learner_id | null (skip)
  const [cols, setCols]           = useState<Record<number, ColState>>({});
  const refYear                   = new Date().getFullYear();
  const [refGrade, setRefGrade]   = useState<number>(10);

  const [include, setInclude]     = useState<Record<string, boolean>>({});         // cell key → include
  const [filter, setFilter]       = useState<'all' | PreviewCell['status']>('all');
  const [saving, setSaving]       = useState(false);
  const [result, setResult]       = useState<{ new: number; updated: number; unchanged: number } | null>(null);

  // Template builder
  const [tplGrade, setTplGrade]   = useState<number | ''>('');
  const [tplSchool, setTplSchool] = useState('');
  const [tplKind, setTplKind]     = useState<'term' | 'baseline'>('term');
  const [tplTerm, setTplTerm]     = useState(1);

  useEffect(() => {
    fetch('/api/v1/programs?limit=100').then(r => r.json()).then(j => {
      const list: Program[] = j.data || [];
      setPrograms(list);
      const tuition = list.find(p => /math/i.test(p.program_name) && !/online/i.test(p.program_name));
      if (tuition) setProgramId(tuition.program_id);
    }).catch(() => toast.error('Could not load programmes'));
  }, []);

  useEffect(() => {
    if (!programId) { setCtx(null); return; }
    setLoadingCtx(true);
    fetch(`/api/v1/marks-upload/context?program_id=${programId}`).then(r => r.json()).then(j => {
      if (j.error) throw new Error(j.error);
      setCtx({ ...j.data, marks: j.data.marks.map((m: { score: unknown }) => ({ ...m, score: Number(m.score) })) });
    }).catch(e => toast.error(e.message || 'Could not load learners')).finally(() => setLoadingCtx(false));
  }, [programId]);

  // ── Parsed sheet ───────────────────────────────────────────────────────────
  const sheet = useMemo(() => {
    if (!workbook || !sheetName) return null;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: null });
    // Heading row: the first row with at least 3 filled cells
    const h = Math.max(0, aoa.findIndex(r => r.filter(v => v != null && String(v).trim() !== '').length >= 3));
    const headers = aoa[h] ?? [];
    const rows = aoa.slice(h + 1).filter(r => r.some(v => v != null && String(v).trim() !== ''));
    return { headers, rows, layout: detectLayout(headers, rows) };
  }, [workbook, sheetName]);

  const aliasMap = useMemo(() => Object.fromEntries((ctx?.aliases ?? []).map(a => [a.alias_key, a.learner_id])), [ctx]);
  const learnerById = useMemo(() => new Map((ctx?.learners ?? []).map(l => [l.learner_id, l])), [ctx]);

  const matches: MatchResult[] = useMemo(() => {
    if (!sheet || !ctx) return [];
    const { nameCol, codeCol } = sheet.layout;
    return sheet.rows.map(r => matchLearner(r[nameCol], codeCol != null ? r[codeCol] : null, ctx.learners, aliasMap));
  }, [sheet, ctx, aliasMap]);

  const learnerFor = (i: number) => (i in picks ? picks[i] : matches[i]?.learner_id ?? null);

  // When a sheet loads: suggest column mappings and the group's current grade
  useEffect(() => {
    if (!sheet || !ctx) return;
    const remembered = Object.fromEntries(ctx.mappings.map(m => [m.header_key, m as ColumnMapping]));
    const sugg = suggestMappings(sheet.headers, remembered);
    setCols(Object.fromEntries(sheet.layout.markCols.map(c => [c, sugg[c] as ColState])));
    setPicks({});
    const ids = new Set(matches.map(m => m.learner_id).filter(Boolean));
    const g = inferCurrentGrade(ctx.marks.filter(m => ids.has(m.learner_id)).map(m => m.notes), refYear)
      ?? mode(ctx.learners.filter(l => ids.has(l.learner_id)).map(l => l.grade).filter((x): x is number => x != null));
    if (g) setRefGrade(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, ctx]);

  const labelFor = (c: number): string | null => {
    const s = cols[c];
    if (!s?.mapping || s.mapping.kind === 'ignore' || !isCompleteMapping(s.mapping)) return null;
    const year = s.year ?? yearForGrade(s.mapping.grade!, refGrade, refYear);
    return buildLabel(s.mapping, year)?.notes ?? null;
  };

  // ── Step checks ────────────────────────────────────────────────────────────
  const dupLearners = useMemo(() => {
    if (!sheet) return new Map<string, number[]>();
    const by = new Map<string, number[]>();
    sheet.rows.forEach((_, i) => { const id = learnerFor(i); if (id) by.set(id, [...(by.get(id) ?? []), i]); });
    return new Map([...by].filter(([, v]) => v.length > 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, matches, picks]);
  const unmatchedRows = sheet ? sheet.rows.map((_, i) => i).filter(i => !(i in picks) && !matches[i]?.learner_id) : [];

  const incompleteCols = sheet ? sheet.layout.markCols.filter(c => cols[c]?.mapping?.kind !== 'ignore' && !labelFor(c)) : [];
  const dupLabels = useMemo(() => {
    if (!sheet) return [] as string[];
    const seen = new Map<string, number>();
    sheet.layout.markCols.forEach(c => { const l = labelFor(c); if (l) seen.set(l, (seen.get(l) ?? 0) + 1); });
    return [...seen].filter(([, n]) => n > 1).map(([l]) => l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, cols, refGrade]);

  // ── Preview ────────────────────────────────────────────────────────────────
  const preview = useMemo(() => {
    if (!sheet || !ctx || step < 4) return [];
    const existing = new Map(ctx.marks.map(m => [markKey(m.learner_id, m.notes), m.score]));
    return buildPreview({ rows: sheet.rows, markCols: sheet.layout.markCols, learnerFor, labelFor, existing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, ctx, step, cols, picks, refGrade]);

  const cellKey = (c: PreviewCell) => markKey(c.learner_id, c.notes);
  const defaultInclude = (c: PreviewCell) => c.status === 'new';
  const isIncluded = (c: PreviewCell) =>
    c.status === 'unchanged' || c.status === 'invalid' ? false : (include[cellKey(c)] ?? defaultInclude(c));
  const counts = preview.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }), {} as Record<string, number>);
  const toSave = preview.filter(isIncluded);

  // ── Actions ────────────────────────────────────────────────────────────────
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(xlsx|xlsm|xls|csv)$/i.test(f.name)) { toast.error('Upload an Excel (.xlsx) or CSV file'); return; }
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false });
      setWorkbook(wb); setSheetName(wb.SheetNames[0]); setFileName(f.name); setResult(null); setInclude({});
    } catch { toast.error('Could not read that file. Is it a valid Excel or CSV file?'); }
  };

  const setCol = (c: number, patch: Partial<ColumnMapping>) =>
    setCols(prev => {
      const cur = prev[c]?.mapping ?? { kind: 'term' as MarkKind };
      return { ...prev, [c]: { mapping: { ...cur, ...patch }, from: 'teacher', year: undefined } };
    });

  const save = async () => {
    if (!sheet || !toSave.length) return;
    setSaving(true);
    try {
      const mappings = sheet.layout.markCols
        .filter(c => cols[c]?.from !== 'label' && cols[c]?.mapping && (cols[c].mapping!.kind === 'ignore' || labelFor(c)))
        .map(c => ({ header_key: headerKey(sheet.headers[c]), ...cols[c].mapping! }))
        .filter(m => m.header_key);
      const aliases = Object.entries(picks)
        .filter(([, id]) => id)
        .map(([i, id]) => ({ alias_key: headerKey(sheet.rows[+i][sheet.layout.nameCol]), learner_id: id as string }))
        .filter(a => a.alias_key);
      const body = { program_id: programId, source_name: fileName, mappings, aliases,
        rows: toSave.map(c => ({ learner_id: c.learner_id, notes: c.notes, score: c.score })) };

      // Check first (nothing is saved), then save for real only if it agrees with the preview
      const check = await post({ ...body, dry_run: true });
      const expectedNew = toSave.filter(c => c.old == null).length;
      if (check.new !== expectedNew || check.updated !== toSave.length - expectedNew) {
        throw new Error('The marks changed while you were reviewing. Go back a step and check the preview again.');
      }
      const done = await post({ ...body, dry_run: false });
      setResult(done);
      toast.success(`Saved ${done.new + done.updated} marks`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const downloadTemplate = () => {
    if (!ctx || !tplGrade) return;
    const learners = ctx.learners.filter(l => l.grade === tplGrade && (!tplSchool || l.school === tplSchool));
    if (!learners.length) { toast.error('No learners in that grade and school'); return; }
    const labels: string[] = [];
    for (const source of ['School', 'Melisizwe'] as const)
      for (const subject of ['Maths', 'Science'] as const) {
        if (tplKind === 'baseline' && source === 'School') continue;
        const meta = buildLabel({ kind: tplKind, source, subject, term: tplTerm, grade: tplGrade }, refYear);
        if (meta) labels.push(meta.notes);
      }
    const aoa = [['Learner code', 'Learner', 'School', ...labels],
      ...learners.map(l => [l.learner_code, [l.first_name, l.last_name].filter(Boolean).join(' '), l.school ?? '', ...labels.map(() => '')])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 12 }, { wch: 26 }, { wch: 28 }, ...labels.map(() => ({ wch: 34 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, `marks_template_gr${tplGrade}_${tplKind === 'term' ? `term${tplTerm}` : 'baseline'}_${refYear}.xlsx`);
  };

  const reset = () => { setStep(1); setWorkbook(null); setSheetName(''); setFileName(''); setPicks({}); setCols({}); setInclude({}); setResult(null); };

  // ── Render ─────────────────────────────────────────────────────────────────
  const grades  = [...new Set((ctx?.learners ?? []).map(l => l.grade).filter((g): g is number => g != null))].sort();
  const schools = [...new Set((ctx?.learners ?? []).map(l => l.school).filter((s): s is string => !!s))].sort();
  const sortedLearners = [...(ctx?.learners ?? [])].sort((a, b) => learnerLabel(a).localeCompare(learnerLabel(b)));

  if (result) return (
    <div className="space-y-6 max-w-3xl">
      <div style={card} className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: DS.successLight }}>
          <Check className="w-6 h-6" style={{ color: DS.success }} />
        </div>
        <h1 className="text-xl font-bold" style={{ color: DS.text }}>Marks saved</h1>
        <p className="text-sm" style={{ color: DS.textMid }}>
          {result.new} new and {result.updated} updated marks from <strong>{fileName}</strong>. Risk scores have been refreshed.
          Column choices and name matches are remembered for next time.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">Upload another file</button>
          <Link href="/assessments" className="btn-secondary">Back to assessments</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/assessments" className="text-sm hover:underline" style={{ color: DS.textMuted }}>← Back</Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: DS.text }}>Upload marks</h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>Upload an Excel mark sheet. Nothing is saved until you confirm the preview.</p>
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex flex-wrap gap-2 text-xs font-semibold">
        {['File', 'Learners', 'Columns', 'Preview & save'].map((s, i) => {
          const n = (i + 1) as Step, active = step === n, done = step > n;
          return (
            <li key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: active ? DS.primary : done ? DS.primaryLight : DS.surfaceHover, color: active ? '#fff' : done ? DS.primary : DS.textMuted }}>
              <span>{done ? '✓' : n}</span>{s}
            </li>
          );
        })}
      </ol>

      {/* ── Step 1: file ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div style={card} className="space-y-5">
            <div>
              <label style={labelSt} htmlFor="mu-programme">Programme</label>
              <select id="mu-programme" value={programId} onChange={e => setProgramId(e.target.value)} style={{ ...selectSt, minWidth: 280 }}>
                <option value="">Select programme…</option>
                {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
              </select>
              {loadingCtx && <span className="ml-3 text-xs" style={{ color: DS.textMuted }}><Loader2 className="inline w-3 h-3 animate-spin" /> Loading learners…</span>}
              {ctx && !loadingCtx && <span className="ml-3 text-xs" style={{ color: DS.textMuted }}>{ctx.learners.length} learners</span>}
            </div>

            <label htmlFor="mu-file"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl py-10 cursor-pointer text-center"
              style={{ border: `2px dashed ${DS.primaryBorder}`, background: DS.surfaceHover }}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
              <FileSpreadsheet className="w-8 h-8" style={{ color: DS.primary }} />
              <span className="text-sm font-semibold" style={{ color: DS.text }}>{fileName || 'Drop your Excel mark sheet here, or click to choose'}</span>
              <span className="text-xs" style={{ color: DS.textMuted }}>.xlsx or .csv · one row per learner · one column per assessment</span>
              <input id="mu-file" type="file" accept=".xlsx,.xlsm,.xls,.csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
            </label>

            {workbook && workbook.SheetNames.length > 1 && (
              <div>
                <label style={labelSt} htmlFor="mu-sheet">Sheet</label>
                <select id="mu-sheet" value={sheetName} onChange={e => setSheetName(e.target.value)} style={selectSt}>
                  {workbook.SheetNames.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            {sheet && (
              <p className="text-sm" style={{ color: DS.textMid }}>
                Found <strong>{sheet.rows.length}</strong> learner rows and <strong>{sheet.layout.markCols.length}</strong> mark columns.
                Names are read from <strong>{String(sheet.headers[sheet.layout.nameCol] ?? 'column A').trim()}</strong>
                {sheet.layout.codeCol != null && <> and learner codes from <strong>{String(sheet.headers[sheet.layout.codeCol]).trim()}</strong></>}.
              </p>
            )}
            <div className="flex justify-end">
              <button className="btn-primary" disabled={!sheet || !ctx || !sheet.layout.markCols.length} onClick={() => setStep(2)}>
                Next: match learners <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Template */}
          <div style={card} className="space-y-3 self-start">
            <h2 className="text-sm font-bold" style={{ color: DS.text }}>Start from a template</h2>
            <p className="text-xs" style={{ color: DS.textMuted }}>A sheet with your learners and the right column headings already filled in, so everything matches automatically.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelSt} htmlFor="tpl-grade">Grade</label>
                <select id="tpl-grade" value={tplGrade} onChange={e => setTplGrade(e.target.value ? +e.target.value : '')} style={{ ...selectSt, width: '100%' }}>
                  <option value="">Choose…</option>{grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt} htmlFor="tpl-kind">Marks for</label>
                <select id="tpl-kind" value={tplKind === 'baseline' ? 'b' : String(tplTerm)}
                  onChange={e => { if (e.target.value === 'b') setTplKind('baseline'); else { setTplKind('term'); setTplTerm(+e.target.value); } }}
                  style={{ ...selectSt, width: '100%' }}>
                  <option value="b">Baseline</option>{[1, 2, 3, 4].map(t => <option key={t} value={t}>Term {t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelSt} htmlFor="tpl-school">School</label>
              <select id="tpl-school" value={tplSchool} onChange={e => setTplSchool(e.target.value)} style={{ ...selectSt, width: '100%' }}>
                <option value="">All schools</option>{schools.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn-secondary w-full justify-center" disabled={!ctx || !tplGrade} onClick={downloadTemplate}>
              <Download className="w-4 h-4" /> Download template ({refYear})
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: learners ───────────────────────────────────────────────── */}
      {step === 2 && sheet && ctx && (
        <div style={card} className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm" style={{ color: DS.textMid }}>
            <Badge bg={DS.successLight} fg={DS.success}>{sheet.rows.length - unmatchedRows.length} matched</Badge>
            {unmatchedRows.length > 0 && <Badge bg={DS.warnLight} fg={DS.warn}>{unmatchedRows.length} need you</Badge>}
            {dupLearners.size > 0 && <Badge bg={DS.dangerLight} fg={DS.danger}>{dupLearners.size} learner{dupLearners.size > 1 ? 's' : ''} on more than one row</Badge>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 640 }}>
              <thead><tr><th style={th}>Row in sheet</th><th style={th}>Learner</th><th style={th}>How</th></tr></thead>
              <tbody>
                {sheet.rows.map((r, i) => {
                  const id = learnerFor(i), m = matches[i], dup = id && dupLearners.has(id);
                  const how = i in picks ? (picks[i] ? 'Chosen by you' : 'Skipped') : m.method === 'code' ? 'Learner code' : m.method === 'alias' ? 'Remembered' : m.method === 'name' ? 'Name' : 'Not sure';
                  const options = [...m.candidates.map(c => learnerById.get(c.learner_id)!).filter(Boolean),
                    ...sortedLearners.filter(l => !m.candidates.some(c => c.learner_id === l.learner_id))];
                  return (
                    <tr key={i} style={{ background: !id && !(i in picks) ? DS.warnLight : dup ? DS.dangerLight : undefined }}>
                      <td style={td}>{String(r[sheet.layout.nameCol] ?? '').trim() || <em style={{ color: DS.textMuted }}>(no name)</em>}
                        {sheet.layout.codeCol != null && r[sheet.layout.codeCol] ? <span style={{ color: DS.textMuted }}> · {String(r[sheet.layout.codeCol])}</span> : null}</td>
                      <td style={td}>
                        <select aria-label={`Learner for row ${i + 1}`} value={id ?? (i in picks ? '__skip' : '')} style={{ ...selectSt, minWidth: 260 }}
                          onChange={e => setPicks(p => ({ ...p, [i]: e.target.value === '__skip' ? null : e.target.value || null }))}>
                          {!id && !(i in picks) && <option value="">Choose a learner…</option>}
                          <option value="__skip">Skip this row</option>
                          {options.map(l => <option key={l.learner_id} value={l.learner_id}>{learnerLabel(l)}</option>)}
                        </select>
                        {dup && <div className="text-xs mt-1" style={{ color: DS.danger }}>Also on row {dupLearners.get(id!)!.filter(x => x !== i).map(x => x + 1).join(', ')}. Pick the right learner or skip one.</div>}
                      </td>
                      <td style={{ ...td, color: DS.textMuted }}>{how}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Back</button>
            <button className="btn-primary" disabled={unmatchedRows.length > 0 || dupLearners.size > 0} onClick={() => setStep(3)}>
              Next: check columns <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: columns ────────────────────────────────────────────────── */}
      {step === 3 && sheet && (
        <div style={card} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm rounded-xl px-4 py-3" style={{ background: DS.surfaceHover, color: DS.textMid }}>
            <label htmlFor="mu-refgrade">In {refYear}, these learners are in</label>
            <select id="mu-refgrade" value={refGrade} onChange={e => setRefGrade(+e.target.value)} style={selectSt}>
              {[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <span style={{ color: DS.textMuted }}>so Grade 9 marks are from {yearForGrade(9, refGrade, refYear)}.</span>
          </div>
          {dupLabels.length > 0 && (
            <p className="text-sm flex items-center gap-2" style={{ color: DS.danger }}><AlertTriangle className="w-4 h-4" />
              Two columns point to the same mark: {dupLabels.join('; ')}. Change or ignore one of them.</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr>
                <th style={th}>Column in sheet</th><th style={th}>Example</th><th style={th}>Type</th><th style={th}>Source</th>
                <th style={th}>Subject</th><th style={th}>Term</th><th style={th}>Grade</th><th style={th}>Will be saved as</th>
              </tr></thead>
              <tbody>
                {sheet.layout.markCols.map(c => {
                  const s = cols[c], m = s?.mapping, label = labelFor(c), ignored = m?.kind === 'ignore';
                  const ex = sheet.rows.map(r => r[c]).find(v => v != null && v !== '' && v !== 0);
                  const fixedFromLabel = s?.from === 'label';
                  return (
                    <tr key={c} style={{ opacity: ignored ? 0.55 : 1 }}>
                      <td style={td}><strong>{String(sheet.headers[c]).trim()}</strong>
                        <div className="text-xs" style={{ color: DS.textMuted }}>
                          {s?.from === 'label' ? 'Standard heading' : s?.from === 'remembered' ? 'Remembered' : s?.from === 'guess' ? 'Suggested, please check' : s?.from === 'teacher' ? 'Set by you' : 'Needs you'}
                        </div></td>
                      <td style={{ ...td, color: DS.textMuted }}>{ex != null ? String(ex) : '–'}</td>
                      <td style={td}>
                        <select aria-label="Type" value={m?.kind ?? ''} disabled={fixedFromLabel} style={selectSt}
                          onChange={e => setCol(c, { kind: e.target.value as MarkKind })}>
                          {!m && <option value="">Choose…</option>}
                          {KINDS.map(k => <option key={k.v} value={k.v}>{k.label}</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        {(m?.kind === 'term' || m?.kind === 'baseline') && (
                          <select aria-label="Source" value={m.source ?? ''} disabled={fixedFromLabel} style={selectSt} onChange={e => setCol(c, { source: e.target.value as 'Melisizwe' | 'School' })}>
                            <option value="">–</option><option>School</option><option>Melisizwe</option>
                          </select>)}
                      </td>
                      <td style={td}>
                        {m && !ignored && (
                          <select aria-label="Subject" value={m.subject ?? ''} disabled={fixedFromLabel} style={selectSt} onChange={e => setCol(c, { subject: e.target.value as 'Maths' | 'Science' })}>
                            <option value="">–</option><option>Maths</option><option>Science</option>
                          </select>)}
                      </td>
                      <td style={td}>
                        {m?.kind === 'term' && (
                          <select aria-label="Term" value={m.term ?? ''} disabled={fixedFromLabel} style={selectSt} onChange={e => setCol(c, { term: +e.target.value })}>
                            <option value="">–</option>{[1, 2, 3, 4].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>)}
                      </td>
                      <td style={td}>
                        {m && !ignored && (
                          <select aria-label="Grade" value={m.grade ?? ''} disabled={fixedFromLabel} style={selectSt} onChange={e => setCol(c, { grade: +e.target.value })}>
                            <option value="">–</option>{[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>{g}</option>)}
                          </select>)}
                      </td>
                      <td style={{ ...td, color: label ? DS.primary : ignored ? DS.textMuted : DS.danger, fontWeight: 600 }}>
                        {ignored ? 'Not imported' : label ?? 'Fill in the missing details'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /> Back</button>
            <button className="btn-primary" disabled={incompleteCols.length > 0 || dupLabels.length > 0} onClick={() => { setInclude({}); setStep(4); }}>
              Next: preview <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: preview & save ─────────────────────────────────────────── */}
      {step === 4 && sheet && (
        <div style={card} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'new', 'changed', 'suspicious', 'invalid', 'unchanged'] as const).map(f => {
              const n = f === 'all' ? preview.length : counts[f] ?? 0;
              if (f !== 'all' && !n) return null;
              const st = f === 'all' ? { bg: DS.primaryLight, fg: DS.primary, label: 'All' } : STATUS_STYLE[f];
              return (
                <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: st.bg, color: st.fg, outline: filter === f ? `2px solid ${st.fg}` : 'none' }}>
                  {st.label} · {n}
                </button>
              );
            })}
          </div>
          {(counts.changed || counts.suspicious) ? (
            <p className="text-sm" style={{ color: DS.textMid }}>
              New marks are ticked. <strong>Changed</strong> marks and marks to <strong>check</strong> are only saved if you tick them.
              {' '}{counts.changed ? <button className="underline" style={{ color: DS.primary }}
                onClick={() => setInclude(p => ({ ...p, ...Object.fromEntries(preview.filter(c => c.status === 'changed').map(c => [cellKey(c), true])) }))}>Tick all changed marks</button> : null}
            </p>
          ) : null}
          <div className="overflow-x-auto" style={{ maxHeight: 520 }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 760 }}>
              <thead style={{ position: 'sticky', top: 0, background: DS.surface }}><tr>
                <th style={th}>Save</th><th style={th}>Learner</th><th style={th}>Mark</th><th style={th}>In sheet</th>
                <th style={th}>Saved now</th><th style={th}>Will be</th><th style={th}>Status</th>
              </tr></thead>
              <tbody>
                {preview.filter(c => filter === 'all' || c.status === filter).slice(0, 1500).map(c => {
                  const st = STATUS_STYLE[c.status], k = cellKey(c), canPick = c.status !== 'unchanged' && c.status !== 'invalid';
                  const l = learnerById.get(c.learner_id);
                  return (
                    <tr key={`${k}|${c.row}|${c.col}`}>
                      <td style={td}>{canPick && <input type="checkbox" aria-label="Save this mark" checked={isIncluded(c)}
                        onChange={e => setInclude(p => ({ ...p, [k]: e.target.checked }))} style={{ accentColor: DS.primary, width: 16, height: 16 }} />}</td>
                      <td style={td}>{l ? learnerLabel(l) : c.learner_id}</td>
                      <td style={td}>{c.notes}</td>
                      <td style={{ ...td, color: DS.textMuted }}>{String(c.raw)}</td>
                      <td style={td}>{c.old != null ? `${c.old}%` : '–'}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{c.score != null ? `${c.score}%` : '–'}</td>
                      <td style={td}><Badge bg={st.bg} fg={st.fg}>{st.label}</Badge>
                        {c.reason && <div className="text-xs mt-1" style={{ color: DS.textMuted }}>{REASON_TEXT[c.reason]}</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <button className="btn-secondary" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4" /> Back</button>
            <button className="btn-primary" disabled={saving || !toSave.length} onClick={save}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {toSave.length ? `Save ${toSave.length} mark${toSave.length > 1 ? 's' : ''}` : 'Nothing to save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
async function post(body: unknown): Promise<{ new: number; updated: number; unchanged: number }> {
  const res = await fetch('/api/v1/marks-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(j.error || 'Save failed');
  return j.data;
}

function mode(xs: number[]): number | null {
  const c = new Map<number, number>(); xs.forEach(x => c.set(x, (c.get(x) ?? 0) + 1));
  let best: number | null = null, n = 0; for (const [k, v] of c) if (v > n) { best = k; n = v; } return best;
}
