/**
 * Pure helpers for the Excel mark upload (/assessments/upload).
 * No I/O here, so everything is unit-testable (see __tests__/marks-upload.test.ts).
 *
 * Marks are identified by their label, stored in assessments.notes, e.g.
 *   "School Maths — Term 1 (Grade 10 (2025))"
 * The label formats below must match the existing data exactly.
 */

export type MarkKind   = 'term' | 'baseline' | 'application' | 'june_assignment' | 'ignore';
export type MarkSource = 'Melisizwe' | 'School';
export type MarkSubject = 'Maths' | 'Science';

export interface ColumnMapping {
  kind:     MarkKind;
  source?:  MarkSource | null;
  subject?: MarkSubject | null;
  term?:    number | null;
  grade?:   number | null;
}

export interface LabelMeta {
  notes:           string;
  subject:         'Mathematics' | 'Science';
  assessment_type: 'test' | 'other' | 'quiz' | 'assignment';
  term:            number | null;
  assessment_date: string;
}

export interface LearnerRef {
  learner_id:   string;
  learner_code: string;
  first_name:   string | null;
  last_name:    string | null;
  school:       string | null;
  grade:        number | null;
}

// ── Headings ──────────────────────────────────────────────────────────────────

/** Normalised key used to remember a heading's mapping. */
export const headerKey = (h: unknown) =>
  String(h ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

const LABEL_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => { mapping: ColumnMapping; year: number }]> = [
  [/^(Melisizwe|School) (Maths|Science) — Term (\d) \(Grade (\d+) \((\d{4})\)\)$/,
    m => ({ mapping: { kind: 'term', source: m[1] as MarkSource, subject: m[2] as MarkSubject, term: +m[3], grade: +m[4] }, year: +m[5] })],
  [/^(Melisizwe|School) (Maths|Science) Baseline \(Grade (\d+) \((\d{4})\)\)$/,
    m => ({ mapping: { kind: 'baseline', source: m[1] as MarkSource, subject: m[2] as MarkSubject, grade: +m[3] }, year: +m[4] })],
  [/^Application Mark — (Mathematics|Science) \(Grade (\d+) \((\d{4})\)\)$/,
    m => ({ mapping: { kind: 'application', subject: m[1] === 'Mathematics' ? 'Maths' : 'Science', grade: +m[2] }, year: +m[3] })],
  [/^June (Maths|Science) Assignment \(Grade (\d+) \((\d{4})\)\)$/,
    m => ({ mapping: { kind: 'june_assignment', subject: m[1] as MarkSubject, grade: +m[2] }, year: +m[3] })],
];

/** Recognise a heading that is already a standard label (e.g. from our template). */
export function parseStandardLabel(h: unknown): { mapping: ColumnMapping; year: number } | null {
  const s = String(h ?? '').trim().replace(/\s+-\s+/g, ' — ');
  for (const [re, build] of LABEL_PATTERNS) {
    const m = s.match(re);
    if (m) return build(m);
  }
  return null;
}

/**
 * Best guess at what a free-form heading means, e.g. "Term1 Science-Grade 9"
 * → School Science, Term 1, Grade 9. Returns null when the kind or subject
 * can't be told; the teacher then maps it by hand (and it's remembered).
 */
export function suggestMapping(h: unknown): ColumnMapping | null {
  // "Term1" → "Term 1", "Grade9" → "Grade 9"
  const k = headerKey(h).replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');
  if (!k) return null;

  const subject: MarkSubject | null =
    /\bmath/.test(k) ? 'Maths' : /\bscien|\bphysical/.test(k) ? 'Science' : null;
  const gradeM = k.match(/\bgrade (\d{1,2})\b/);
  const grade  = gradeM ? +gradeM[1] : null;
  const termM  = k.match(/\bterm (\d)\b/);
  const isMel  = /m?e?l[ie]s[ie]?zwe|meliszwe/.test(k);
  const isSchool = /\bschool\b/.test(k);
  if (!subject) return null;

  if (/\bapplication\b/.test(k)) return { kind: 'application', subject, grade };
  if (/\bassignment\b/.test(k))  return { kind: 'june_assignment', subject, grade };
  if (/\bbase ?line\b/.test(k))  return { kind: 'baseline', source: isSchool ? 'School' : 'Melisizwe', subject, grade };
  if (termM)                     return { kind: 'term', source: isMel ? 'Melisizwe' : 'School', subject, term: +termM[1], grade };
  if (/\bjune\b/.test(k))        return { kind: 'term', source: isSchool ? 'School' : 'Melisizwe', subject, term: 2, grade };
  if (/\bfinal\b/.test(k))       return { kind: 'term', source: isSchool ? 'School' : 'Melisizwe', subject, term: 4, grade };
  return null;
}

/**
 * Suggest mappings for a row of headings, left to right. Sheets are usually
 * laid out in grade sections, so a heading with no grade ("Term3 Math School")
 * takes the grade of the nearest heading to its left that has one.
 * `remembered` (header_key → mapping) wins over any guess.
 */
export function suggestMappings(
  headers: unknown[], remembered: Record<string, ColumnMapping> = {},
): Array<{ mapping: ColumnMapping | null; from: 'label' | 'remembered' | 'guess' | null; year?: number }> {
  let lastGrade: number | null = null;
  return headers.map(h => {
    const std = parseStandardLabel(h);
    if (std) { lastGrade = std.mapping.grade ?? lastGrade; return { mapping: std.mapping, from: 'label' as const, year: std.year }; }
    const rem = remembered[headerKey(h)];
    if (rem) { if (rem.grade) lastGrade = rem.grade; return { mapping: rem, from: 'remembered' as const }; }
    const g = suggestMapping(h);
    const explicitGrade = String(h ?? '').match(/grade\s*(\d{1,2})/i);
    if (explicitGrade) lastGrade = +explicitGrade[1];
    if (!g) return { mapping: null, from: null };
    return { mapping: { ...g, grade: g.grade ?? lastGrade }, from: 'guess' as const };
  });
}

export const isCompleteMapping =(m: ColumnMapping | null | undefined): m is ColumnMapping =>
  !!m && (m.kind === 'ignore' || (!!m.subject && !!m.grade &&
    (m.kind !== 'term' || (!!m.term && !!m.source)) &&
    (m.kind !== 'baseline' || !!m.source)));

// ── Labels ────────────────────────────────────────────────────────────────────

const TERM_DATES: Record<number, string> = { 1: '04-10', 2: '06-30', 3: '09-12', 4: '11-20' };

/** Year a group was in `colGrade`, given they're in `refGrade` in `refYear`. */
export const yearForGrade = (colGrade: number, refGrade: number, refYear: number) =>
  refYear - (refGrade - colGrade);

export function buildLabel(m: ColumnMapping, year: number): LabelMeta | null {
  if (!isCompleteMapping(m) || m.kind === 'ignore') return null;
  const g = m.grade!, subj = m.subject!;
  const full = subj === 'Maths' ? 'Mathematics' : 'Science';
  const tail = `(Grade ${g} (${year}))`;
  switch (m.kind) {
    case 'term':
      return { notes: `${m.source} ${subj} — Term ${m.term} ${tail}`, subject: full, assessment_type: 'test',
               term: m.term!, assessment_date: `${year}-${TERM_DATES[m.term!]}` };
    case 'baseline':
      return { notes: `${m.source} ${subj} Baseline ${tail}`, subject: full, assessment_type: 'other',
               term: 1, assessment_date: `${year}-04-10` };
    case 'application':
      return { notes: `Application Mark — ${full} ${tail}`, subject: full, assessment_type: 'quiz',
               term: null, assessment_date: `${year}-01-01` };
    case 'june_assignment':
      return { notes: `June ${subj} Assignment ${tail}`, subject: full, assessment_type: 'assignment',
               term: 2, assessment_date: `${year}-06-30` };
  }
  return null;
}

// ── Values ────────────────────────────────────────────────────────────────────

export type CellValue =
  | { kind: 'blank' }
  | { kind: 'text'; raw: string }
  | { kind: 'number'; value: number };

/** Blank, 0, "-" and "absent"-style cells all mean "not written". */
export function readCell(raw: unknown): CellValue {
  if (raw === null || raw === undefined) return { kind: 'blank' };
  if (typeof raw === 'number') return raw === 0 || !isFinite(raw) ? { kind: 'blank' } : { kind: 'number', value: raw };
  const s = String(raw).trim();
  if (!s || /^(-+|0+([.,]0+)?%?|n\/?a|absent|ab)$/i.test(s)) return { kind: 'blank' };
  const n = Number(s.replace('%', '').replace(',', '.'));
  if (!isNaN(n)) return n === 0 ? { kind: 'blank' } : { kind: 'number', value: n };
  return { kind: 'text', raw: s };
}

/** A column is a 0–1 decimal column when most of its marks are ≤ 1. */
export function isFractionColumn(cells: CellValue[]): boolean {
  const nums = cells.filter((c): c is { kind: 'number'; value: number } => c.kind === 'number').map(c => c.value);
  if (!nums.length) return false;
  return nums.filter(v => v <= 1).length / nums.length >= 0.6;
}

export type ValueFlag = 'scale_mismatch' | 'over_100' | 'text';

/** Convert a cell to a percentage, flagging anything that doesn't fit its column. */
export function toPercent(cell: CellValue, fractionColumn: boolean): { score: number | null; flag: ValueFlag | null } {
  if (cell.kind === 'blank') return { score: null, flag: null };
  if (cell.kind === 'text')  return { score: null, flag: 'text' };
  const v = cell.value;
  let score: number, flag: ValueFlag | null = null;
  if (fractionColumn) { score = v <= 1 ? v * 100 : v; if (v > 1) flag = 'scale_mismatch'; }
  else                { score = v <= 1 ? v * 100 : v; if (v <= 1) flag = 'scale_mismatch'; }
  score = Math.round(score * 100) / 100;
  if (score > 100) flag = 'over_100';
  return { score, flag };
}

// ── Learner matching ──────────────────────────────────────────────────────────

const SCHOOL_WORDS = ['ujma','uj','academy','sos','school','secondary','high','diepdale','missouri','laan','lancea','vale','st','barnabas','vorentoe'];

export function nameTokens(raw: unknown, extraStop: string[] = []): string[] {
  const stop = new Set([...SCHOOL_WORDS, ...extraStop]);
  return String(raw ?? '')
    .replace(/\.(mp4|mov|jpg|jpeg|png|pdf|docx?|xlsx?)\b/gi, ' ')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z]+/).filter(t => t.length >= 2 && !stop.has(t));
}

function oneEditApart(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function nameScore(tokens: string[], l: LearnerRef): number {
  const rec = nameTokens(`${l.first_name ?? ''} ${l.last_name ?? ''}`);
  let score = 0;
  for (const t of tokens) {
    if (rec.includes(t)) score += 2;
    else if (t.length >= 4 && rec.some(r => r.length >= 4 && oneEditApart(t, r))) score += 1;
  }
  return score;
}

export const learnerLabel = (l: LearnerRef) =>
  `${[l.first_name, l.last_name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()} (${l.learner_code})`;

export interface MatchResult {
  learner_id: string | null;
  method:     'code' | 'alias' | 'name' | null;
  candidates: Array<{ learner_id: string; score: number }>;
}

/**
 * Match a spreadsheet row to a learner: learner code first, then a remembered
 * alias, then the name. A name only auto-matches when one learner clearly wins
 * (e.g. "Kamogele" alone is offered as a suggestion, not auto-matched).
 */
export function matchLearner(
  rawName: unknown, rawCode: unknown, learners: LearnerRef[], aliases: Record<string, string>,
): MatchResult {
  const code = String(rawCode ?? rawName ?? '').toUpperCase().match(/\bLRN\d{3}\b/)?.[0];
  if (code) {
    const l = learners.find(x => x.learner_code === code);
    if (l) return { learner_id: l.learner_id, method: 'code', candidates: [] };
  }
  const aliasId = aliases[headerKey(rawName)];
  if (aliasId && learners.some(l => l.learner_id === aliasId)) {
    return { learner_id: aliasId, method: 'alias', candidates: [] };
  }
  const tokens = nameTokens(rawName);
  const ranked = learners.map(l => ({ learner_id: l.learner_id, score: nameScore(tokens, l) }))
    .filter(c => c.score > 0).sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  const clear = best && (!second || second.score < best.score) &&
    (best.score >= 3 || (best.score === 2 && ranked.length === 1));
  return { learner_id: clear ? best.learner_id : null, method: clear ? 'name' : null, candidates: ranked.slice(0, 5) };
}

// ── Suspicious marks ──────────────────────────────────────────────────────────

/** A mark this far from the learner's own average is held for a second look. */
export const OUTLIER_POINTS = 40;

export const isOutlier = (score: number, others: number[]) => {
  if (others.length < 3) return false;
  const avg = others.reduce((a, b) => a + b, 0) / others.length;
  return Math.abs(score - avg) > OUTLIER_POINTS;
};

// ── Sheet layout ──────────────────────────────────────────────────────────────

export interface SheetLayout { nameCol: number; codeCol: number | null; schoolCol: number | null; markCols: number[] }

/** Find the name / code / school columns; everything else with a heading is a mark column. */
export function detectLayout(headers: unknown[], rows: unknown[][]): SheetLayout {
  const keys = headers.map(headerKey);
  const codeCol   = keys.findIndex(k => /\bcode\b/.test(k));
  const schoolCol = keys.findIndex(k => /^school( name)?$/.test(k));
  let nameCol     = keys.findIndex((k, i) => i !== codeCol && /\b(name|learner|surname)\b/.test(k) && !/\bcode\b/.test(k));
  if (nameCol < 0) nameCol = codeCol === 0 ? 1 : 0;
  const fixed = new Set([nameCol, codeCol, schoolCol].filter(i => i >= 0));
  const markCols = headers.map((_, i) => i).filter(i =>
    !fixed.has(i) && keys[i] !== '' && rows.some(r => readCell(r[i]).kind !== 'blank'));
  return { nameCol, codeCol: codeCol >= 0 ? codeCol : null, schoolCol: schoolCol >= 0 ? schoolCol : null, markCols };
}

// ── Preview ───────────────────────────────────────────────────────────────────

export type CellStatus = 'new' | 'unchanged' | 'changed' | 'suspicious' | 'invalid';

export interface PreviewCell {
  row:        number;          // index into data rows
  col:        number;          // sheet column index
  learner_id: string;
  notes:      string;
  raw:        unknown;
  score:      number | null;
  old:        number | null;   // existing mark with this label, if any
  status:     CellStatus;
  reason:     ValueFlag | 'outlier' | null;
}

export interface PreviewInput {
  rows:      unknown[][];
  markCols:  number[];
  learnerFor: (row: number) => string | null;                     // null = skip row
  labelFor:   (col: number) => string | null;                     // null = ignored / incomplete column
  existing:   Map<string, number>;                                // `${learner_id}|${notes}` → score
}

export const markKey = (learnerId: string, notes: string) => `${learnerId}|${notes}`;

const subjectOf = (notes: string) => (/Math/.test(notes) ? 'Maths' : /Science/.test(notes) ? 'Science' : 'Other');

export function buildPreview(p: PreviewInput): PreviewCell[] {
  const fraction = new Map(p.markCols.map(c => [c, isFractionColumn(p.rows.map(r => readCell(r[c])))]));
  const cells: PreviewCell[] = [];

  // Existing marks per learner, for the outlier check
  const existingByLearner = new Map<string, Map<string, number>>();
  for (const [k, v] of p.existing) {
    const [lid, notes] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
    if (!existingByLearner.has(lid)) existingByLearner.set(lid, new Map());
    existingByLearner.get(lid)!.set(notes, v);
  }

  p.rows.forEach((r, row) => {
    const lid = p.learnerFor(row);
    if (!lid) return;
    const fileMarks = new Map<string, number>();
    const pending: Array<Omit<PreviewCell, 'status' | 'reason'> & { flag: ValueFlag | null }> = [];
    for (const col of p.markCols) {
      const notes = p.labelFor(col);
      if (!notes) continue;
      const cell = readCell(r[col]);
      if (cell.kind === 'blank') continue;
      const { score, flag } = toPercent(cell, fraction.get(col)!);
      const old = p.existing.get(markKey(lid, notes)) ?? null;
      if (score != null && !flag) fileMarks.set(notes, score);
      pending.push({ row, col, learner_id: lid, notes, raw: r[col], score, old, flag });
    }
    for (const c of pending) {
      let status: CellStatus, reason: PreviewCell['reason'] = c.flag;
      if (c.flag === 'text' || c.flag === 'over_100' || c.score == null) status = 'invalid';
      else if (c.old != null && Math.abs(c.old - c.score) < 0.005) { status = 'unchanged'; reason = null; }
      else {
        // Compare with the learner's other marks in the same subject
        const subj = subjectOf(c.notes);
        const others = [...new Map([...(existingByLearner.get(lid) ?? new Map()), ...fileMarks])]
          .filter(([n]) => n !== c.notes && subjectOf(n) === subj).map(([, v]) => v);
        if (!c.flag && isOutlier(c.score, others)) reason = 'outlier';
        status = reason ? 'suspicious' : c.old == null ? 'new' : 'changed';
      }
      const { flag: _f, ...rest } = c;
      cells.push({ ...rest, status, reason });
    }
  });
  return cells;
}

/** The grade a group is in now, inferred from labels on its learners' existing marks. */
export function inferCurrentGrade(notesList: string[], refYear: number): number | null {
  const counts = new Map<number, number>();
  for (const n of notesList) {
    const m = n.match(/\(Grade (\d+) \((\d{4})\)\)$/);
    if (!m) continue;
    const g = +m[1] + (refYear - +m[2]);
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  let best: number | null = null, bestN = 0;
  for (const [g, n] of counts) if (n > bestN) { best = g; bestN = n; }
  return best;
}
