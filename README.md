# Girls in STEM — Recruitment Platform

Next.js 14 + Supabase dashboard for the Melisizwe Girls in STEM programme.

## Stack
- **Next.js 14** (App Router, Server Components, Server Actions)
- **Supabase** (PostgreSQL, Auth, Storage, Realtime)
- **Tailwind CSS** (utility styling)
- **Recharts** (analytics charts)
- **TypeScript** (end-to-end types)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (sidebar + fonts)
│   ├── page.tsx                # Redirects → /dashboard
│   ├── globals.css             # Design tokens + animations
│   ├── dashboard/page.tsx      # Overview with KPIs + charts
│   ├── candidates/
│   │   ├── page.tsx            # Full candidate list
│   │   └── [id]/page.tsx       # Individual candidate detail
│   ├── scoring/page.tsx        # Interactive scoring calculator
│   ├── reports/page.tsx        # Analytics + data export
│   └── apply/page.tsx          # Application intake form
├── components/
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── ui/index.tsx            # Shared UI primitives
│   ├── DashboardCharts.tsx     # Recharts components
│   ├── CandidatesTable.tsx     # Filterable/sortable table
│   ├── ScoreEditor.tsx         # Live score editing form
│   ├── ScoringCalculator.tsx   # Interactive calculator
│   ├── ApplicationForm.tsx     # Multi-step application form
│   └── ReportsClient.tsx       # CSV export button
├── lib/
│   ├── supabase/client.ts      # Browser Supabase client
│   ├── supabase/server.ts      # Server Supabase client
│   └── data.ts                 # All data fetching + mutations
└── types/index.ts              # Shared TypeScript types
```

## Setup

### 1. Database
Run these SQL files in your Supabase project (SQL Editor):
1. `../girls-stem/001_schema.sql`
2. `../girls-stem/002_scores_seed.sql`
3. `../girls-stem/003_functions.sql`

### 2. Install dependencies
```bash
npm install
```

### 3. Environment variables
```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and keys
```

### 4. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel
```bash
npx vercel
# Add environment variables when prompted
```

## Key Pages

| URL | Description |
|-----|-------------|
| `/dashboard` | KPI overview, top candidates, charts |
| `/candidates` | Searchable, filterable candidate table |
| `/candidates/[id]` | Full scorecard + live score editor |
| `/scoring` | Interactive scoring calculator with formula |
| `/reports` | School analytics + CSV export |
| `/apply` | Multi-step application form |

## Scoring Formula

```
Composite = (AP/20×20) + (AA/25×25) + (Math/50×15)
          + (Sci/50×15) + (Psych/20×15) + (Video/15×10)

Accept    ≥ 70
Waitlist  55–69
Review    < 55
Incomplete < 4 components scored
```

## Adding a New Candidate Manually

1. Go to `/apply` → fill in the form → Submit
2. Scores appear in Supabase automatically
3. Add test scores via `/candidates/[id]` → Edit Scores panel

## Updating Scores

Navigate to `/candidates/[id]` and use the **Edit Scores** panel.
The composite score and decision update in real-time as you type,
and are saved to Supabase on click.
