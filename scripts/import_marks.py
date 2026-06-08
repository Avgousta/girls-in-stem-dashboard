"""
Full historic marks import for Girls in STEM
- Adds 17 unmatched learners to the DB (LRN047-LRN063)
- Inserts all assessment records from Grade9_2024, Grade10_2025, Grade11_2026
"""
import pandas as pd
import json, os, re, uuid, urllib.request, urllib.error

# ── Load env ────────────────────────────────────────────────────────────────
with open('C:/Users/User/girls-stem-dashboard/.env.local') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1); os.environ[k] = v.strip('"')

URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': KEY, 'Authorization': f'Bearer {KEY}',
           'Content-Type': 'application/json', 'Prefer': 'return=representation'}

def sb_get(path):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', headers=HEADERS)
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def sb_post(path, data):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}',
        data=json.dumps(data).encode(), headers=HEADERS, method='POST')
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        return None, e.read().decode()

def sb_post_bulk(path, rows, batch=200):
    ok = 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i+batch]
        req = urllib.request.Request(f'{URL}/rest/v1/{path}',
            data=json.dumps(chunk).encode(), headers=HEADERS, method='POST')
        try:
            with urllib.request.urlopen(req) as r:
                ok += len(chunk)
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            if 'duplicate' not in err.lower():
                print(f'  Batch error: {err[:200]}')
    return ok

# ── Reference IDs ────────────────────────────────────────────────────────────
SCHOOL_MAP = {
    'ujma':      '62a449e8-10be-4f5d-896e-35631e35ec27',  # UJ Academy SOS
    'uj academy':'62a449e8-10be-4f5d-896e-35631e35ec27',
    'diepdale':  '597bb2be-02a7-48f4-8090-04e0e942716e',
    'missouri':  '365dca52-2b35-456c-bfd4-e4d5c8882b11',
    'lancea':    '453d3e1e-7542-4326-9d4f-4a8685e130ae',
    'st barnabas':'2795c76f-6020-4864-8456-7b0e245c901e',
    'barnabas':  '2795c76f-6020-4864-8456-7b0e245c901e',
}
PROG_ID = '346b2d9a-1fcf-4caa-8073-cdc5807110eb'   # Girls in STEM (active)

def school_id(raw):
    r = str(raw).lower().strip()
    for k, v in SCHOOL_MAP.items():
        if k in r: return v
    return SCHOOL_MAP['ujma']  # default

# ── Learner matching ─────────────────────────────────────────────────────────
def norm(s):
    s = str(s).lower().strip()
    s = re.sub(r'[-\s]*(ujma|diepdale|missouri|lancea|sos|barnabas).*', '', s, flags=re.I)
    s = re.sub(r'[.\-_]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

MATCHED = {
    'aisha hasim':             'LRN020',
    'aisha saddiqa hassim':    'LRN020',
    'aisha saddiqa hassim hassim': 'LRN020',
    'aphiwe mchiza':           'LRN045',
    'bushra patel':            'LRN021',
    'dakalo mulaudzi':         'LRN044',
    'dominique rajanna':       'LRN022',
    'enhle ngwane':            'LRN023',
    'fatima davids':           'LRN024',
    'hilwa ibraahim':          'LRN025',
    'hilwa ebrahim':           'LRN025',
    'hirkumari maisuriya':     'LRN026',
    'hirkumair maisuriya':     'LRN026',
    'husnaa ishmial':          'LRN027',
    'jasmine anderson':        'LRN043',
    'sihaam jeena':            'LRN031',
    'kamogelo simayile':       'LRN028',
    'katlego lesejane':        'LRN042',
    'leandra bensen':          'LRN041',
    'lebohang hlangwane':      'LRN040',
    'lebogang molapo':         'LRN039',
    'mapula mongalo':          'LRN029',
    'mapula mangalo':          'LRN029',
    'mukundi magoma':          'LRN038',
    'ndodozo netshiheni':      'LRN037',
    'ndodzo netshiheni':       'LRN037',
    'nokukhanya mthethwa':     'LRN036',
    'samantha vukeya':         'LRN035',
    'sameea mangera':          'LRN030',
    'shalati baloyi':          'LRN034',
    'shalat baloyi':           'LRN034',
    'thandolwami nyakeni':     'LRN033',
    'yoliswa ngxanga':         'LRN032',
    'anzani ndou':             'LRN046',
}

def lookup_code(raw_name):
    n = norm(raw_name)
    if n in MATCHED: return MATCHED[n]
    parts = n.split()
    if len(parts) >= 2:
        for k, v in MATCHED.items():
            kp = k.split()
            if parts[0] in kp and parts[-1] in kp:
                return v
    return None

# ── Load existing learner_code → learner_id map ──────────────────────────────
print('Loading existing learners...')
existing = sb_get('learners?select=learner_id,learner_code')
CODE_TO_ID = {r['learner_code']: r['learner_id'] for r in existing}
print(f'  {len(CODE_TO_ID)} learners in DB, max = {max(CODE_TO_ID)}')

# ── Load spreadsheet ─────────────────────────────────────────────────────────
xl = pd.read_excel('C:/Users/User/Downloads/Sage Girls in STEM - Mark Sheet.xlsx', sheet_name=None)

# ── Column configuration ─────────────────────────────────────────────────────
# (col_name, subject, assessment_type, term, notes_tag)
def make_col_map(year):
    m = {}
    prefix = {'Gr9': 2024, 'Gr10': 2025, 'Gr11': 2026}
    y = year

    # Term-end approximate dates per SA school calendar
    def date(term):
        dates = {1: f'{y}-04-10', 2: f'{y}-06-30', 3: f'{y}-09-12', 4: f'{y}-11-20', 0: f'{y}-02-10'}
        return dates.get(term, f'{y}-06-01')

    m['App_Mark_Maths']         = ('Mathematics','test',   0, 'Application mark', date(0))
    m['App_Mark_Science/100']   = ('Science',    'test',   0, 'Application mark', date(0))
    m['Math Baseline_T1']       = ('Mathematics','test',   1, 'Baseline assessment', date(1))
    m['Science Baseline_T1']    = ('Science',    'test',   1, 'Baseline assessment', date(1))
    m['Science Baseline_T2']    = ('Science',    'test',   2, 'Baseline assessment', date(2))
    m['June Math Assignment']   = ('Mathematics','assignment',2,'June assignment', date(2))
    m['June Science Assignment']= ('Science',    'assignment',2,'June assignment', date(2))

    for t in [1,2,3,4]:
        d = date(t)
        m[f'M_Science_T{t}']  = ('Science',    'quiz', t, 'Melisizwe programme assessment', d)
        m[f'S_Science_T{t}']  = ('Science',    'test', t, 'School assessment', d)
        m[f'M_Math_T{t}']     = ('Mathematics','quiz', t, 'Melisizwe programme assessment', d)
        m[f'M_MATH_T{t}']     = ('Mathematics','quiz', t, 'Melisizwe programme assessment', d)
        m[f'S_Math_T{t}']     = ('Mathematics','test', t, 'School assessment', d)
        m[f'S_Math_T{t}']     = ('Mathematics','test', t, 'School assessment', d)
        m[f'M_Science_T{t}']  = ('Science',    'quiz', t, 'Melisizwe programme assessment', d)
    return m

def grade_band(pct):
    if pct >= 80: return 'Distinction'
    if pct >= 70: return 'Merit'
    if pct >= 50: return 'Pass'
    return 'Needs Support'

# ── Step 1: Find unmatched learners across all sheets ────────────────────────
print('\nScanning for unmatched learners...')
unmatched = {}  # norm_name → {raw, school, sheets}
SHEETS = [('Grade9_2024',2024,9), ('Grade10_2025',2025,10), ('Grade11_2026',2026,11)]

for sheet, year, grade in SHEETS:
    df = xl[sheet]
    for _, row in df.iterrows():
        raw = str(row.get('Learner','')).strip()
        if not raw or raw == 'nan': continue
        if lookup_code(raw): continue   # already matched
        key = norm(raw)
        if key not in unmatched:
            unmatched[key] = {'raw': raw, 'school': str(row.get('School','')).strip(),
                              'sheets': [], 'grade': grade}
        unmatched[key]['sheets'].append(year)
        unmatched[key]['grade'] = grade  # use most-recent grade

print(f'  {len(unmatched)} unmatched learners to add')

# ── Step 2: Insert new learners (LRN047 onwards) ─────────────────────────────
# Get current max code number
max_num = max(int(c.replace('LRN','')) for c in CODE_TO_ID)
new_learner_inserts   = []
new_profile_inserts   = []
new_enrollment_inserts = []
new_code_map = {}   # norm_name → new_code

print('\nCreating new learner records...')
for i, (key, info) in enumerate(sorted(unmatched.items())):
    max_num += 1
    code = f'LRN{max_num:03d}'
    lid  = str(uuid.uuid4())
    new_code_map[key] = (code, lid)

    name_parts = info['raw'].replace('_',' ').strip().split()
    first = name_parts[0] if name_parts else 'Unknown'
    last  = ' '.join(name_parts[1:]) if len(name_parts) > 1 else '?'

    sid   = school_id(info['school'])

    new_learner_inserts.append({
        'learner_id': lid, 'learner_code': code,
        'grade': info['grade'], 'school_id': sid,
        'programme_status': 'active',
        'enrollment_date': f'{min(info["sheets"])}-02-01',
    })
    new_profile_inserts.append({
        'learner_id': lid, 'first_name': first, 'last_name': last,
    })
    new_enrollment_inserts.append({
        'learner_id': lid, 'program_id': PROG_ID, 'status': 'active',
        'enrolled_at': f'{min(info["sheets"])}-02-01',
    })
    print(f'  {code}: {info["raw"]} ({info["school"]}, Grade {info["grade"]})')

# Insert new learners in correct order (learner → profile → enrollment)
if new_learner_inserts:
    n = sb_post_bulk('learners', new_learner_inserts)
    print(f'  Inserted {n} learner rows')
    n = sb_post_bulk('learner_profiles', new_profile_inserts)
    print(f'  Inserted {n} profile rows')
    n = sb_post_bulk('program_enrollments', new_enrollment_inserts)
    print(f'  Inserted {n} enrollment rows')

# ── Update CODE_TO_ID with new learners ──────────────────────────────────────
for key, (code, lid) in new_code_map.items():
    CODE_TO_ID[code] = lid
    # Also add to MATCHED for the assessment step below
    parts = key.split()
    MATCHED[key] = code

# ── Step 3: Build all assessment records ─────────────────────────────────────
print('\nBuilding assessment records...')
assessment_rows = []
skipped = 0

for sheet, year, sheet_grade in SHEETS:
    df = xl[sheet]
    col_map = make_col_map(year)

    for _, row in df.iterrows():
        raw = str(row.get('Learner','')).strip()
        if not raw or raw == 'nan': continue

        # Find learner_id
        code = lookup_code(raw)
        if not code:
            # Check newly added
            key = norm(raw)
            if key in new_code_map:
                code = new_code_map[key][0]
        if not code:
            skipped += 1
            continue

        lid = CODE_TO_ID.get(code)
        if not lid:
            skipped += 1
            continue

        for col, (subject, atype, term, note_tag, date) in col_map.items():
            val = row.get(col, None)
            if val is None or (isinstance(val, float) and pd.isna(val)):
                continue
            try:
                fval = float(val)
            except:
                continue
            if fval < 0 or fval > 1.05: continue   # ignore bad values

            pct = round(min(fval, 1.0) * 100, 1)
            assessment_rows.append({
                'learner_id':      lid,
                'program_id':      PROG_ID,
                'subject':         subject,
                'assessment_type': atype,
                'difficulty':      'medium',
                'score':           pct,
                'max_score':       100,
                'percentage':      pct,
                'grade_band':      grade_band(pct),
                'assessment_date': date,
                'term':            term if term else None,
                'notes':           f'{note_tag} — {sheet}',
            })

print(f'  Built {len(assessment_rows)} records ({skipped} learners skipped)')

# ── Step 4: Insert assessments ───────────────────────────────────────────────
print('\nInserting assessment records...')
inserted = sb_post_bulk('assessments', assessment_rows, batch=200)
print(f'  ✅ Inserted {inserted} assessment records')

# ── Step 5: Re-run risk score calculation ────────────────────────────────────
print('\nTriggering risk score recalculation...')
req = urllib.request.Request(
    f'{URL}/rest/v1/rpc/calculate_risk_scores',
    data=b'{}', headers=HEADERS, method='POST'
)
try:
    with urllib.request.urlopen(req) as r: print(f'  Risk scores updated')
except Exception as e:
    print(f'  Risk calc skipped (ok to run manually): {e}')

print('\n✅ Import complete!')
print(f'   {len(new_learner_inserts)} new learners added (LRN{max_num-len(new_learner_inserts)+1:03d}–LRN{max_num:03d})')
print(f'   {len(assessment_rows)} assessment records inserted')
