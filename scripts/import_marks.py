"""
Re-imports assessment marks from the Sage Girls in STEM mark sheet.
Clears all previously imported records then re-inserts with full
per-term labels, using the `term` column properly.

Run: py scripts/import_marks.py
Requires: pip install pandas openpyxl supabase
"""

import sys, uuid, re, os
import pandas as pd
sys.stdout.reconfigure(encoding='utf-8')

# ── Config ────────────────────────────────────────────────────────────────────
SPREADSHEET   = r'C:\Users\User\Downloads\Sage Girls in STEM - Mark Sheet.xlsx'
MATCHING_FILE = r'C:\Users\User\Downloads\GirlsSTEM_Learner_Matching_Report.xlsx'
PROGRAM_ID    = 'd39f75b7-4612-4a49-acaa-c00e0aa7db07'  # Girls in STEM (Mar 19)

# Load env from .env.local if not already set
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
if not SUPABASE_URL or not SUPABASE_KEY:
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip().strip('"')
        SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
        SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('ERROR: Missing SUPABASE_URL or SERVICE_ROLE_KEY. Run `vercel env pull .env.local` first.')
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Build name → learner_id map ───────────────────────────────────────────────
mr = pd.read_excel(MATCHING_FILE, sheet_name='Learner Matching Report', header=None)
name_to_code = {}
for _, row in mr.iterrows():
    name = str(row[0]).strip() if pd.notna(row[0]) else ''
    code = str(row[3]).strip() if pd.notna(row[3]) else ''
    if code.startswith('LRN') and name:
        name_to_code[name.lower()] = code

resp = sb.table('learners').select('learner_id,learner_code').execute()
code_to_id = {r['learner_code']: r['learner_id'] for r in resp.data}

# Also add the 17 previously-unmatched learners who now have DB records (LRN047–LRN065)
# Map their spreadsheet names directly to their learner_codes
EXTRA_MATCHES = {
    'ashiqa jansen':            'LRN047',
    'fatima zahra khan':        'LRN048',
    'funanani tshikovha':       'LRN049',
    'hannah ramuhulu':          'LRN050',
    'joanie booysens':          'LRN051',
    'keratilwe maputla':        'LRN052',
    'kowsara ali':              'LRN053',
    'kutlwano katsana gloria':  'LRN054',
    'lebogang hlangwane':       'LRN055',
    'lebohang molapo':          'LRN056',
    'lilitha loliwe':           'LRN057',
    'linda sithole':            'LRN058',
    'munira sharmo':            'LRN059',
    'naseerah patel':           'LRN060',
    'ntsako malungani':         'LRN061',
    'olwethu hlongwane':        'LRN062',
    'precious mathumba':        'LRN063',
    'tracy ngonayma':           'LRN064',
    'yusayrah adam':            'LRN065',
}
name_to_code.update(EXTRA_MATCHES)

def resolve_learner(name: str):
    key = name.strip().lower()
    if key in name_to_code:
        return code_to_id.get(name_to_code[key])
    key2 = re.split(r'[-–]', key)[0].strip()
    if key2 in name_to_code:
        return code_to_id.get(name_to_code[key2])
    key3 = key.replace('.', ' ')
    if key3 in name_to_code:
        return code_to_id.get(name_to_code[key3])
    return None

# ── Column → descriptor map ───────────────────────────────────────────────────
# (subject, term_num, assessment_type, label)
# Baseline uses Feb 10; term dates are Apr/Jun/Sep/Nov
COLUMN_MAP = {
    'App_Mark_Maths':           ('Mathematics', None, 'quiz',       'Application Mark — Mathematics'),
    'App_Mark_Science/100':     ('Science',     None, 'quiz',       'Application Mark — Science'),
    'Math Baseline_T1':         ('Mathematics', 1,    'other',   'Melisizwe Maths Baseline'),
    'Science Baseline_T1':      ('Science',     1,    'other',   'Melisizwe Science Baseline'),
    'Science Baseline_T2':      ('Science',     2,    'other',   'Melisizwe Science Baseline'),
    'M_Science_T1':             ('Science',     1,    'test',       'Melisizwe Science — Term 1'),
    'M_Science_T2':             ('Science',     2,    'test',       'Melisizwe Science — Term 2'),
    'M_Science_T3':             ('Science',     3,    'test',       'Melisizwe Science — Term 3'),
    'M_Science_T4':             ('Science',     4,    'test',       'Melisizwe Science — Term 4'),
    'S_Science_T1':             ('Science',     1,    'test',       'School Science — Term 1'),
    'S_Science_T2':             ('Science',     2,    'test',       'School Science — Term 2'),
    'S_Science_T3':             ('Science',     3,    'test',       'School Science — Term 3'),
    'S_Science_T4':             ('Science',     4,    'test',       'School Science — Term 4'),
    'M_Math_T1':                ('Mathematics', 1,    'test',       'Melisizwe Maths — Term 1'),
    'M_Math_T2':                ('Mathematics', 2,    'test',       'Melisizwe Maths — Term 2'),
    'M_Math_T3':                ('Mathematics', 3,    'test',       'Melisizwe Maths — Term 3'),
    'M_MATH_T4':                ('Mathematics', 4,    'test',       'Melisizwe Maths — Term 4'),
    'S_Math_T1':                ('Mathematics', 1,    'test',       'School Maths — Term 1'),
    'S_Math_T2':                ('Mathematics', 2,    'test',       'School Maths — Term 2'),
    'S_Math_T3':                ('Mathematics', 3,    'test',       'School Maths — Term 3'),
    'S_Math_T4':                ('Mathematics', 4,    'test',       'School Maths — Term 4'),
    'June Math Assignment':     ('Mathematics', 2,    'assignment', 'June Maths Assignment'),
    'June Science Assignment':  ('Science',     2,    'assignment', 'June Science Assignment'),
}

TERM_DATES = {None: (1, 1), 1: (4, 10), 2: (6, 30), 3: (9, 12), 4: (11, 20)}

def grade_band(pct: float) -> str:
    if pct >= 80: return 'Distinction'
    if pct >= 70: return 'Merit'
    if pct >= 50: return 'Pass'
    return 'Fail'

SHEETS = [
    ('Grade9_2024',  2024, 'Grade 9 (2024)'),
    ('Grade10_2025', 2025, 'Grade 10 (2025)'),
    ('Grade11_2026', 2026, 'Grade 11 (2026)'),
]

# ── Delete previously imported records ───────────────────────────────────────
print('Clearing previously imported records…')
for grade_label in ['Grade 9 (2024)', 'Grade 10 (2025)', 'Grade 11 (2026)']:
    res = sb.table('assessments').delete().like('notes', f'%({grade_label})%').execute()
    print(f'  Deleted {len(res.data)} records for {grade_label}')
# Also clear old-style grouped records
for old_label in ['Melisizwe assessment (Grade', 'School assessment (Grade',
                  'Baseline (Grade', 'Application mark (Grade', 'June assignment (Grade']:
    res = sb.table('assessments').delete().like('notes', f'{old_label}%').execute()
    print(f'  Deleted {len(res.data)} old-style "{old_label}…"')

# ── Build rows ────────────────────────────────────────────────────────────────
rows = []
skipped_names = set()

for sheet_name, year, grade_label in SHEETS:
    df = pd.read_excel(SPREADSHEET, sheet_name=sheet_name, header=0)
    print(f'\n{sheet_name}: {len(df)} learners, {len(df.columns)} columns')

    for _, lrow in df.iterrows():
        raw_name = str(lrow.get('Learner', '')).strip()
        if not raw_name or raw_name.lower() in ('learner', 'nan', ''):
            continue

        learner_id = resolve_learner(raw_name)
        if not learner_id:
            skipped_names.add(raw_name)
            continue

        for col, (subject, term_num, a_type, label) in COLUMN_MAP.items():
            if col not in lrow.index:
                continue
            val = lrow[col]
            if pd.isna(val):
                continue
            try:
                val_f = float(val)
            except (ValueError, TypeError):
                continue
            if val_f <= 0:
                continue

            # Values are 0–1 decimals except some school marks stored as integers
            score = round(val_f * 100, 2) if val_f <= 1.0 else round(val_f, 2)
            score = min(score, 100)  # cap at 100

            # Date: baselines → Feb 10, others → term date
            m, d = (2, 10) if a_type == 'baseline' else TERM_DATES.get(term_num, (1, 1))
            assessment_date = f'{year}-{m:02d}-{d:02d}'

            rows.append({
                'assessment_id':   str(uuid.uuid4()),
                'learner_id':      learner_id,
                'program_id':      PROGRAM_ID,
                'subject':         subject,
                'score':           score,
                'max_score':       100,
                'grade_band':      grade_band(score),
                'assessment_date': assessment_date,
                'assessment_type': a_type,
                'difficulty':      'medium',
                'term':            term_num,
                'notes':           f'{label} ({grade_label})',
            })

print(f'\nTotal rows to insert: {len(rows)}')
if skipped_names:
    print(f'Could not match (no DB record): {sorted(skipped_names)}')

# ── Insert in batches ─────────────────────────────────────────────────────────
BATCH = 200
inserted = 0
for i in range(0, len(rows), BATCH):
    batch = rows[i:i+BATCH]
    res = sb.table('assessments').insert(batch).execute()
    inserted += len(res.data)
    print(f'  Batch {i//BATCH+1}: inserted {len(res.data)}')

print(f'\nDone. {inserted} assessment records imported.')
