import pandas as pd, re

xl = pd.read_excel('C:/Users/User/Downloads/Sage Girls in STEM - Mark Sheet.xlsx', sheet_name=None)

db_learners = [
    ('6e83c29e-5a64-4611-a89a-7ce57acc7212','LRN020','Aisha Saddiqa Hassim Hassim','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('3d88c1f0-d521-4270-a1e5-b08d67c1c700','LRN045','Aphiwe Mchiza','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('245afa12-855e-413e-8c13-456dfdbe4f5c','LRN021','Bushra Patel','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('02d25626-6d93-467c-9301-9fd0c6400a34','LRN044','Dakalo Mulaudzi','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('94898cd2-d4f7-4b91-8125-8a4ee38a37b8','LRN022','Dominique Rajanna','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('ec68d0e4-6ec1-4639-84c9-50a1f284826f','LRN023','Enhle Ngwane','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('f15c38b6-ab41-49a2-aa5c-599cf369d32e','LRN024','Fatima Davids','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('b4896527-03d1-46ac-81a1-2c4509f00744','LRN025','Hilwa Ibraahim','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('d379cc3a-4682-4476-87d2-d85fab0fc805','LRN026','Hirkumari Maisuriya','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('333412f0-34e7-48ea-b499-8a806c70fc74','LRN027','Husnaa Ishmial','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('30212ca7-92a7-47f4-8515-bf12299868a4','LRN043','Jasmine Anderson','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('6fb0bb25-3cb4-48d7-aa60-2012cf5c4435','LRN031','Sihaam Jeena','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('f1c9e5f0-d611-4a9e-9158-ea934024f413','LRN028','Kamogelo Simayile','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('1501d380-50f7-437b-8ceb-38949446b039','LRN042','Katlego Lesejane','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('e7977edb-d8c4-4d92-9c48-8212799f0cf6','LRN041','Leandra Bensen','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('945ce99b-b6bb-4192-85ba-9a14a12045b8','LRN040','Lebohang Hlangwane','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('683ca47b-90a0-4e18-bc8e-3e7ebf329132','LRN039','Lebogang Molapo','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('629520fa-5598-4f96-8dcd-f0531fd65bfa','LRN029','Mapula Mongalo','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('b590af7d-3cf7-4423-babc-61c9d19e0dc0','LRN038','Mukundi Magoma','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('0dae75cf-f17f-4f52-a6fb-8c91405b7514','LRN037','Ndodozo Netshiheni','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('dc93c1bf-5c5f-49e4-8a91-de0b506481e8','LRN036','Nokukhanya Mthethwa','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('f107eb9e-9000-4b0c-97a4-12b8fb758e6f','LRN035','Samantha Vukeya','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('9f1666cd-f571-4dba-b199-8f6330fd70f9','LRN030','Sameea Mangera','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('f8f05cd5-9365-45a3-8815-16fc52c1d038','LRN034','Shalati Baloyi','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('fa2e32f5-cdf0-4770-9ad9-46867abf6944','LRN033','Thandolwami Nyakeni','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('7ac79169-1ac6-4775-8e4a-b8adfd530543','LRN032','Yoliswa Ngxanga','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
    ('76e7e26a-baae-479c-b4f7-22eb066fa770','LRN046','Anzani Ndou','346b2d9a-1fcf-4caa-8073-cdc5807110eb'),
]

def norm(s):
    s = str(s).lower().strip()
    s = re.sub(r'[-\s]*(ujma|diepdale|missouri|lancea|sos|barnabas).*','', s, flags=re.IGNORECASE)
    s = re.sub(r'[.\-_]',' ', s)
    s = re.sub(r'\s+',' ', s).strip()
    return s

db_map = {}
for lid, code, name, pid in db_learners:
    db_map[norm(name)] = (lid, code, name, pid)

ALIASES = {
    'aisha hasim':              'aisha saddiqa hassim hassim',
    'aisha saddiqa hassim':     'aisha saddiqa hassim hassim',
    'hilwa ebrahim':            'hilwa ibraahim',
    'hilwa ibraahim':           'hilwa ibraahim',
    'hirkumair maisuriya':      'hirkumari maisuriya',
    'shalat baloyi':            'shalati baloyi',
    'mapula mangalo':           'mapula mongalo',
    'ndodzo netshiheni':        'ndodozo netshiheni',
    'lebogang hlangwane':       'lebohang hlangwane',
    'lebohang molapo':          'lebogang molapo',
    'fatima davids':            'fatima davids',
    'fatima davids':            'fatima davids',
}

def lookup(raw_name):
    n = norm(raw_name)
    if n in db_map:
        return db_map[n]
    if n in ALIASES:
        target = ALIASES[n]
        return db_map.get(target)
    parts = n.split()
    if len(parts) >= 2:
        for k, v in db_map.items():
            kparts = k.split()
            if parts[0] in kparts and parts[-1] in kparts:
                return v
    return None

COL_MAP = {
    'App_Mark_Maths':          ('Mathematics', 'test', 'Melisizwe', None),
    'App_Mark_Science/100':    ('Science',     'test', 'Melisizwe', None),
    'Math Baseline_T1':        ('Mathematics', 'test', 'Melisizwe', 1),
    'Science Baseline_T1':     ('Science',     'test', 'Melisizwe', 1),
    'Science Baseline_T2':     ('Science',     'test', 'Melisizwe', 2),
    'M_Science_T1':            ('Science',     'test', 'Melisizwe', 1),
    'M_Science_T2':            ('Science',     'test', 'Melisizwe', 2),
    'M_Science_T3':            ('Science',     'test', 'Melisizwe', 3),
    'M_Science_T4':            ('Science',     'test', 'Melisizwe', 4),
    'S_Science_T1':            ('Science',     'test', 'School',    1),
    'S_Science_T2':            ('Science',     'test', 'School',    2),
    'S_Science_T3':            ('Science',     'test', 'School',    3),
    'S_Science_T4':            ('Science',     'test', 'School',    4),
    'M_Math_T1':               ('Mathematics', 'test', 'Melisizwe', 1),
    'M_Math_T2':               ('Mathematics', 'test', 'Melisizwe', 2),
    'M_Math_T3':               ('Mathematics', 'test', 'Melisizwe', 3),
    'M_MATH_T4':               ('Mathematics', 'test', 'Melisizwe', 4),
    'S_Math_T1':               ('Mathematics', 'test', 'School',    1),
    'S_Math_T2':               ('Mathematics', 'test', 'School',    2),
    'S_Math_T3':               ('Mathematics', 'test', 'School',    3),
    'S_Math_T4':               ('Mathematics', 'test', 'School',    4),
    'June Math Assignment':    ('Mathematics', 'assignment', 'Melisizwe', 2),
    'June Science Assignment': ('Science',     'assignment', 'Melisizwe', 2),
}

TERM_DATES = {1: '03-15', 2: '06-15', 3: '09-15', 4: '11-15'}

def grade_band(pct):
    if pct >= 80: return 'Distinction'
    if pct >= 70: return 'Merit'
    if pct >= 50: return 'Pass'
    return 'Needs Support'

records = []
unmatched = set()
matched = {}

SHEETS = [
    ('Grade9_2024',  2024, 'Learner'),
    ('Grade10_2025', 2025, 'Learner'),
    ('Grade11_2026', 2026, 'Learner'),
]

for sheet_name, year, name_col in SHEETS:
    df = xl[sheet_name]
    for _, row in df.iterrows():
        raw_name = str(row.get(name_col, '')).strip()
        if not raw_name or raw_name == 'nan':
            continue
        match = lookup(raw_name)
        if not match:
            unmatched.add(raw_name)
            continue
        lid, code, db_name, pid = match
        matched[code] = db_name
        for col, (subject, atype, source, term) in COL_MAP.items():
            if col not in df.columns:
                continue
            val = row.get(col)
            if pd.isna(val):
                continue
            val = float(val)
            if val <= 0:
                continue
            if val > 1.5:
                val = val / 100
            pct = round(val * 100, 1)
            if pct > 100:
                pct = 100.0
            term_val = term if term else 1
            date_str = f'{year}-{TERM_DATES.get(term_val, "06-15")}'
            notes = f'{source} assessment'
            records.append((lid, pid, subject, atype, pct, grade_band(pct), date_str, term_val, notes, code))

print(f'TOTAL RECORDS TO INSERT: {len(records)}')
print(f'\nMATCHED LEARNERS ({len(matched)}):')
for code in sorted(matched):
    print(f'  {code}: {matched[code]}')

print(f'\nNOT IN DATABASE ({len(unmatched)}) - skipped:')
for n in sorted(unmatched):
    print(f'  {n}')

print(f'\nSAMPLE (first 15 records):')
print(f"{'Code':<8} {'Subject':<14} {'Type':<12} {'Pct':>6} {'Band':<14} {'Date':<12} T")
print('-'*75)
for r in records[:15]:
    print(f"{r[9]:<8} {r[2]:<14} {r[3]:<12} {r[4]:>5}% {r[5]:<14} {r[6]:<12} {r[7]}")
