"""Insert historic assessment records — percentage is a generated column so omitted."""
import pandas as pd, json, os, re, urllib.request, urllib.error

with open('C:/Users/User/girls-stem-dashboard/.env.local') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1); os.environ[k] = v.strip('"')

URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
H   = {'apikey': KEY, 'Authorization': f'Bearer {KEY}',
       'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

def sb_get(path):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', headers=H)
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def sb_post_bulk(path, rows, batch=200):
    ok = err = 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i+batch]
        req = urllib.request.Request(f'{URL}/rest/v1/{path}',
            data=json.dumps(chunk).encode(), headers=H, method='POST')
        try:
            with urllib.request.urlopen(req) as r: ok += len(chunk)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()
            if 'duplicate' in msg.lower():
                ok += len(chunk)  # already inserted — still counts
            else:
                print(f'  Batch {i//batch+1} error: {msg[:150]}')
                err += len(chunk)
    return ok, err

PROG_ID = '346b2d9a-1fcf-4caa-8073-cdc5807110eb'

def norm(s):
    s = str(s).lower().strip()
    s = re.sub(r'[-\s]*(ujma|diepdale|missouri|lancea|sos|barnabas).*', '', s, flags=re.I)
    s = re.sub(r'[.\-_]', ' ', s); s = re.sub(r'\s+', ' ', s).strip()
    return s

# Full name → learner code mapping (matched + newly added)
MATCHED = {
    'aisha hasim': 'LRN020', 'aisha saddiqa hassim': 'LRN020',
    'aisha saddiqa hassim hassim': 'LRN020', 'aphiwe mchiza': 'LRN045',
    'bushra patel': 'LRN021', 'dakalo mulaudzi': 'LRN044',
    'dominique rajanna': 'LRN022', 'enhle ngwane': 'LRN023',
    'fatima davids': 'LRN024', 'hilwa ibraahim': 'LRN025',
    'hilwa ebrahim': 'LRN025', 'hirkumari maisuriya': 'LRN026',
    'hirkumair maisuriya': 'LRN026', 'husnaa ishmial': 'LRN027',
    'jasmine anderson': 'LRN043', 'sihaam jeena': 'LRN031',
    'kamogelo simayile': 'LRN028', 'katlego lesejane': 'LRN042',
    'leandra bensen': 'LRN041', 'lebohang hlangwane': 'LRN040',
    'lebogang molapo': 'LRN039', 'mapula mongalo': 'LRN029',
    'mapula mangalo': 'LRN029', 'mukundi magoma': 'LRN038',
    'ndodozo netshiheni': 'LRN037', 'ndodzo netshiheni': 'LRN037',
    'nokukhanya mthethwa': 'LRN036', 'samantha vukeya': 'LRN035',
    'sameea mangera': 'LRN030', 'shalati baloyi': 'LRN034',
    'shalat baloyi': 'LRN034', 'thandolwami nyakeni': 'LRN033',
    'yoliswa ngxanga': 'LRN032', 'anzani ndou': 'LRN046',
    # newly added (LRN047-LRN065)
    'ashiqa jansen': 'LRN047', 'fatima zahra khan': 'LRN048',
    'funanani tshikovha': 'LRN049', 'hannah ramuhulu': 'LRN050',
    'joanie booysens': 'LRN051', 'keratilwe maputla': 'LRN052',
    'kowsara ali': 'LRN053', 'kutlwano katsana gloria': 'LRN054',
    'lebogang hlangwane': 'LRN055', 'lebohang molapo': 'LRN056',
    'lilitha loliwe': 'LRN057', 'linda sithole': 'LRN058',
    'munira sharmo': 'LRN059', 'naseerah patel': 'LRN060',
    'ntsako malungani': 'LRN061', 'olwethu hlongwane': 'LRN062',
    'precious mathumba': 'LRN063', 'tracy ngonayma': 'LRN064',
    'yusayrah adam': 'LRN065',
}

def lookup_code(raw):
    n = norm(raw)
    if n in MATCHED: return MATCHED[n]
    parts = n.split()
    if len(parts) >= 2:
        for k, v in MATCHED.items():
            kp = k.split()
            if parts[0] in kp and parts[-1] in kp: return v
    return None

# Load learner_code -> learner_id
print('Loading learners...')
existing = sb_get('learners?select=learner_id,learner_code')
CODE_TO_ID = {r['learner_code']: r['learner_id'] for r in existing}
print(f'  {len(CODE_TO_ID)} learners loaded (max {max(CODE_TO_ID)})')

# Column config
def make_col_map(year):
    m = {}
    def d(t): return {1:f'{year}-04-10',2:f'{year}-06-30',3:f'{year}-09-12',4:f'{year}-11-20',0:f'{year}-02-10'}[t]
    m['App_Mark_Maths']          = ('Mathematics','test',0,'Application mark',d(0))
    m['App_Mark_Science/100']    = ('Science','test',0,'Application mark',d(0))
    m['Math Baseline_T1']        = ('Mathematics','test',1,'Baseline',d(1))
    m['Science Baseline_T1']     = ('Science','test',1,'Baseline',d(1))
    m['Science Baseline_T2']     = ('Science','test',2,'Baseline',d(2))
    m['June Math Assignment']    = ('Mathematics','assignment',2,'June assignment',d(2))
    m['June Science Assignment'] = ('Science','assignment',2,'June assignment',d(2))
    for t in [1,2,3,4]:
        m[f'M_Science_T{t}']  = ('Science','quiz',t,'Melisizwe assessment',d(t))
        m[f'S_Science_T{t}']  = ('Science','test',t,'School assessment',d(t))
        m[f'M_Math_T{t}']     = ('Mathematics','quiz',t,'Melisizwe assessment',d(t))
        m[f'M_MATH_T{t}']     = ('Mathematics','quiz',t,'Melisizwe assessment',d(t))
        m[f'S_Math_T{t}']     = ('Mathematics','test',t,'School assessment',d(t))
    return m

def gb(p):
    return 'Distinction' if p>=80 else 'Merit' if p>=70 else 'Pass' if p>=50 else 'Needs Support'

xl = pd.read_excel('C:/Users/User/Downloads/Sage Girls in STEM - Mark Sheet.xlsx', sheet_name=None)
SHEETS = [('Grade9_2024',2024), ('Grade10_2025',2025), ('Grade11_2026',2026)]

rows = []
skipped_names = set()
for sheet, year in SHEETS:
    df = xl[sheet]
    col_map = make_col_map(year)
    for _, row in df.iterrows():
        raw = str(row.get('Learner','')).strip()
        if not raw or raw == 'nan': continue
        code = lookup_code(raw)
        if not code:
            skipped_names.add(raw)
            continue
        lid = CODE_TO_ID.get(code)
        if not lid:
            skipped_names.add(f'{raw} (code {code} not in DB)')
            continue
        for col, (subj, atype, term, note, date) in col_map.items():
            val = row.get(col, None)
            if val is None or (isinstance(val, float) and pd.isna(val)): continue
            try: fval = float(val)
            except: continue
            if fval < 0 or fval > 1.05: continue
            pct = round(min(fval, 1.0) * 100, 1)
            rec = {
                'learner_id':      lid,
                'program_id':      PROG_ID,
                'subject':         subj,
                'assessment_type': atype,
                'difficulty':      'medium',
                'score':           pct,
                'max_score':       100,
                'grade_band':      gb(pct),
                'assessment_date': date,
                'notes':           f'{note} ({sheet})',
            }
            rec['term'] = term if term else None   # always include key so all rows match
            rows.append(rec)

print(f'Built {len(rows)} records from {len(SHEETS)} sheets')
if skipped_names:
    print(f'Skipped {len(skipped_names)} unrecognised names: {sorted(skipped_names)}')

print('Inserting...')
ok, err = sb_post_bulk('assessments', rows)
print(f'Inserted {ok} records ({err} errors)')

# Recalculate risk scores
try:
    req = urllib.request.Request(
        f'{URL}/rest/v1/rpc/calculate_risk_scores',
        data=b'{}', headers=H, method='POST')
    urllib.request.urlopen(req)
    print('Risk scores recalculated')
except Exception as e:
    print(f'Risk recalc note: {e}')

print('DONE')
