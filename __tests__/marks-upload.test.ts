import { describe, it, expect } from 'vitest';
import {
  headerKey, parseStandardLabel, suggestMapping, suggestMappings, buildLabel, yearForGrade,
  readCell, isFractionColumn, toPercent, matchLearner, isOutlier, detectLayout, type LearnerRef,
} from '../lib/marks-upload';

// Headings from the real "Second Cohort Data.xlsx" (cohort in Grade 9 in 2024),
// with the label each one was confirmed to match in the database.
const SECOND_COHORT: Array<[string, string | null]> = [
  ['Term 1 Math- Grade 9',                         'School Maths — Term 1 (Grade 9 (2024))'],
  ['Term1 Science-Grade 9',                        'School Science — Term 1 (Grade 9 (2024))'],
  ['Term2 Math- Grade 9',                          'School Maths — Term 2 (Grade 9 (2024))'],
  ['Term2 Science-Grade 9',                        'School Science — Term 2 (Grade 9 (2024))'],
  ['Mathematics Baseline Assessment -Grade 9',     'Melisizwe Maths Baseline (Grade 9 (2024))'],
  ['Natural Sciences Baseline Assessment - Grade 9','Melisizwe Science Baseline (Grade 9 (2024))'],
  ['Maths Grade June',                             'Melisizwe Maths — Term 2 (Grade 9 (2024))'],
  ['Science Grade June-Grade9',                    'Melisizwe Science — Term 2 (Grade 9 (2024))'],
  ['June Math Assignment',                         'June Maths Assignment (Grade 9 (2024))'],
  ['June Science Assignment',                      'June Science Assignment (Grade 9 (2024))'],
  ['Term3 Math School',                            'School Maths — Term 3 (Grade 9 (2024))'],
  ['Term3 Science School ',                        'School Science — Term 3 (Grade 9 (2024))'],
  ['Grade  9 Final Mathematics',                   'Melisizwe Maths — Term 4 (Grade 9 (2024))'],
  ['Grade 9 Final Science',                        'Melisizwe Science — Term 4 (Grade 9 (2024))'],
  ['Term4 Math School',                            'School Maths — Term 4 (Grade 9 (2024))'],
  ['Term4 Science School',                         'School Science — Term 4 (Grade 9 (2024))'],
  ['Melisizwe Maths Baseline Grade 10',            'Melisizwe Maths Baseline (Grade 10 (2025))'],
  ['Melisizwe Term 1 Maths Grade 10',              'Melisizwe Maths — Term 1 (Grade 10 (2025))'],
  ['School Term 1 Maths Grade 10',                 'School Maths — Term 1 (Grade 10 (2025))'],
  ['Melisizwe Science Baseline Grade 10 ',         'Melisizwe Science Baseline (Grade 10 (2025))'],
  ['Melisizwe Term 1 Science Grade 10',            'Melisizwe Science — Term 1 (Grade 10 (2025))'],
  ['School Term1 Science Grade 10',                'School Science — Term 1 (Grade 10 (2025))'],
  ['Melisizwe Term 2 Maths Grade 10',              'Melisizwe Maths — Term 2 (Grade 10 (2025))'],
  ['School Term 2 Maths Grade 10',                 'School Maths — Term 2 (Grade 10 (2025))'],
  ['Melisizwe Term 2 Science Grade 10',            'Melisizwe Science — Term 2 (Grade 10 (2025))'],
  ['School Term 2 Science Grade 10',               'School Science — Term 2 (Grade 10 (2025))'],
  ['School Term 4 Maths',                          'School Maths — Term 4 (Grade 10 (2025))'],
  ['School Term 4 Science',                        'School Science — Term 4 (Grade 10 (2025))'],
  ['Math  Grade 8',                                null], // application mark: mapped by hand once, then remembered
];

describe('suggestMappings on the Second Cohort headings', () => {
  const headers = SECOND_COHORT.map(([h]) => h);
  const sugg = suggestMappings(['Math  Grade 8', ...headers.slice(0, -1)]).slice(1);
  SECOND_COHORT.slice(0, -1).forEach(([h, expected], i) => {
    it(`maps "${h.trim()}"`, () => {
      const m = sugg[i].mapping!;
      expect(m).not.toBeNull();
      expect(buildLabel(m, yearForGrade(m.grade!, 11, 2026))?.notes).toBe(expected);
    });
  });
  it('leaves an unclear heading for the teacher', () => expect(suggestMapping('Math  Grade 8')).toBeNull());
  it('prefers a remembered mapping', () => {
    const r = suggestMappings(['Math  Grade 8'], { [headerKey('Math  Grade 8')]: { kind: 'application', subject: 'Maths', grade: 9 } });
    expect(r[0].from).toBe('remembered');
    expect(buildLabel(r[0].mapping!, 2024)?.notes).toBe('Application Mark — Mathematics (Grade 9 (2024))');
  });
});

describe('standard labels', () => {
  const labels = [
    'School Maths — Term 1 (Grade 10 (2025))', 'Melisizwe Science Baseline (Grade 9 (2024))',
    'Application Mark — Science (Grade 9 (2024))', 'June Maths Assignment (Grade 9 (2024))',
  ];
  labels.forEach(l => it(`round-trips "${l}"`, () => {
    const p = parseStandardLabel(l)!;
    expect(buildLabel(p.mapping, p.year)?.notes).toBe(l);
  }));
  it('uses the same dates and types as existing marks', () => {
    expect(buildLabel({ kind: 'term', source: 'School', subject: 'Science', term: 3, grade: 10 }, 2025))
      .toEqual({ notes: 'School Science — Term 3 (Grade 10 (2025))', subject: 'Science', assessment_type: 'test', term: 3, assessment_date: '2025-09-12' });
    expect(buildLabel({ kind: 'application', subject: 'Maths', grade: 9 }, 2024)?.assessment_date).toBe('2024-01-01');
  });
});

describe('values', () => {
  it('treats blank, 0 and dashes as not written', () => {
    [null, undefined, '', 0, '0', '-', ' ', 'absent'].forEach(v => expect(readCell(v).kind).toBe('blank'));
  });
  it('reads numbers and percent strings', () => {
    expect(readCell('66%')).toEqual({ kind: 'number', value: 66 });
    expect(readCell(0.66)).toEqual({ kind: 'number', value: 0.66 });
  });
  it('detects decimal columns', () => {
    expect(isFractionColumn([0.66, 0.25, 0.58].map(readCell))).toBe(true);
    expect(isFractionColumn([82, 66, 36].map(readCell))).toBe(false);
  });
  it('converts decimals without float noise', () => expect(toPercent(readCell(0.66), true)).toEqual({ score: 66, flag: null }));
  it('flags a whole number in a decimal column', () => expect(toPercent(readCell(38), true)).toEqual({ score: 38, flag: 'scale_mismatch' }));
  it('flags marks over 100', () => expect(toPercent(readCell(120), false).flag).toBe('over_100'));
  it('flags text', () => expect(toPercent(readCell('excellent'), false).flag).toBe('text'));
  it('flags an outlier like Aisha\'s 7%', () => expect(isOutlier(7, [90, 82, 83, 82, 81, 78])).toBe(true));
  it('does not flag a normal mark', () => expect(isOutlier(70, [90, 82, 83, 82])).toBe(false));
});

describe('matchLearner', () => {
  const L = (id: string, code: string, first: string, last: string): LearnerRef =>
    ({ learner_id: id, learner_code: code, first_name: first, last_name: last, school: null, grade: 11 });
  const learners = [
    L('a', 'LRN021', 'Bushra', 'Patel'), L('b', 'LRN060', 'Naseerah', 'Patel'),
    L('c', 'LRN028', 'Kamogelo', 'Simayile'), L('d', 'LRN026', 'Hirkumari', 'Maisuriya'),
    L('e', 'LRN025', 'Hilwa', 'Ibraahim'), L('f', 'LRN024', 'Fatima', 'Davids'), L('g', 'LRN048', 'Fatima', 'Zahra Khan'),
  ];
  it('matches by learner code first', () => expect(matchLearner('Someone', 'LRN060', learners, {}).learner_id).toBe('b'));
  it('strips school names', () => expect(matchLearner('Naseerah Patel- UJMA', null, learners, {}).learner_id).toBe('b'));
  it('tells two Patels apart', () => expect(matchLearner('Bushra Patel', null, learners, {}).learner_id).toBe('a'));
  it('matches on a unique surname despite a misspelt first name', () =>
    expect(matchLearner('Hirkumair Maisuriya- UJMA', null, learners, {}).learner_id).toBe('d'));
  it('tolerates a typo in one name', () => expect(matchLearner('Hilwa Ebrahim', null, learners, {}).learner_id).toBe('e'));
  it('only suggests for a single fuzzy first name', () => {
    const r = matchLearner('Kamogele UJMA.mp4', null, learners, {});
    expect(r.learner_id).toBeNull();
    expect(r.candidates[0].learner_id).toBe('c');
  });
  it('uses a remembered alias', () =>
    expect(matchLearner('Kamogele UJMA.mp4', null, learners, { [headerKey('Kamogele UJMA.mp4')]: 'c' }).learner_id).toBe('c'));
  it('does not guess between two Fatimas', () => expect(matchLearner('Fatima', null, learners, {}).learner_id).toBeNull());
});

describe('detectLayout', () => {
  it('finds name, school and mark columns in the cohort sheet', () => {
    const headers = ['Name ', 'School', 'Math  Grade 8', null, 'Empty col'];
    const rows = [['Bushra Patel', 'UJMA', 69, null, null]];
    expect(detectLayout(headers, rows)).toEqual({ nameCol: 0, codeCol: null, schoolCol: 1, markCols: [2] });
  });
  it('finds the code column in our template', () => {
    const headers = ['Learner code', 'Learner', 'School', 'School Maths — Term 1 (Grade 11 (2026))'];
    expect(detectLayout(headers, [['LRN021', 'Bushra Patel', 'UJ Academy', 70]]))
      .toEqual({ nameCol: 1, codeCol: 0, schoolCol: 2, markCols: [3] });
  });
});
