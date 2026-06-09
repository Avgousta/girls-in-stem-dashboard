# Girls in STEM Dashboard — CLAUDE.md

## Project Overview

A full-stack STEM education management platform for South African schools. Built with Next.js 14 (App Router), Supabase (PostgreSQL + Auth), Tailwind CSS, and TypeScript.

**Working directory:** `C:\Users\User\girls-stem-dashboard`
**Live URL:** `https://girls-stem-dashboard.vercel.app`
**GitHub:** `https://github.com/Avgousta/girls-in-stem-dashboard`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Database | Supabase (PostgreSQL 17) |
| Auth | Supabase Auth + RLS |
| Email | Resend (`re_KTqUyFJn_...` — set on Vercel) |
| Deployment | Vercel (CLI v54 — `npx vercel deploy --prod` to deploy) |

### Commands
```bash
npm run dev        # http://localhost:3000
npm run build
npm run type-check # tsc --noEmit
npx vercel deploy --prod   # deploy to production (use npx, not vercel directly)
vercel env pull .env.local # restore env vars locally
```

---

## Architecture — Route Groups

| Group | Portal | Auth |
|-------|--------|------|
| `(auth)` | Login, register, forgot/reset password | Public |
| `(dashboard)` | Admin + Instructor portal | Supabase session (role: admin \| instructor) |
| `(student)` | Student self-service | Supabase session (role: learner) |
| `(teacher)` | Teacher portal | Supabase session (role: instructor) |
| `(sponsor)` | Sponsor portal | Supabase session (role: sponsor) |

---

## Supabase Project

- **Project name:** girls-in-stem
- **Project ID:** `oozpukejqxqqgjklccjk`
- **Region:** eu-west-2
- **Status:** ACTIVE_HEALTHY
- **URL:** `https://oozpukejqxqqgjklccjk.supabase.co`

---

## Database — Tables

All tables live in the `public` schema. Key tables:

| Table | Purpose |
|-------|---------|
| `schools` | School registry |
| `users` | Platform users (mirrors auth.users) |
| `learners` | Learner records (grade stored as int) |
| `learner_profiles` | Extended learner info (1:1) |
| `programs` | STEM programmes |
| `program_enrollments` | Learner ↔ programme links |
| `attendance` | Session attendance records |
| `assessments` | Assessment scores — see schema notes below |
| `projects` | Learner projects |
| `project_feedback` | Instructor feedback on projects |
| `mentorship_sessions` | Mentorship session logs |
| `mentorship_goals` | Goals set with mentor (`progress` int 0–100) |
| `interventions` | At-risk learner flags |
| `intervention_updates` | Progress notes on interventions |
| `risk_scores` | Auto-calculated risk per learner |
| `notifications` | In-app notifications |
| `sponsors` | Sponsor organisations |
| `sponsor_learners` | Sponsor ↔ learner links |

### assessments table — important constraints
- `assessment_type` CHECK: `('quiz','test','project','practical','assignment','oral','other')`
- `difficulty` CHECK: `('easy','medium','hard','advanced')` — never use `'standard'`
- `percentage` is a **generated column** — never insert it, DB computes it from score/max_score
- `grade_band` should be set manually: `'Distinction'|'Merit'|'Pass'|'Needs Support'`
- `term` is `smallint` (1–4) or null for baselines/application marks

### Active Girls in STEM programme IDs
- `d39f75b7-4612-4a49-acaa-c00e0aa7db07` — **Girls in STEM (Mar 19, active with data)**
- `346b2d9a-1fcf-4caa-8073-cdc5807110eb` — Girls in STEM (Mar 18, is_active=false, duplicate)

### Migrations applied
| Version | Name |
|---------|------|
| 20260101000001 | 001_initial_schema |
| 20260101000002 | 002_analytics_functions |
| (manual) | add_progress_to_mentorship_goals |

---

## Assessment Data — Naming Convention

All imported/captured marks use a structured `notes` label so the learner profile and report group them correctly:

| Pattern | Example |
|---------|---------|
| `Melisizwe Maths — Term N (Grade X (YYYY))` | `Melisizwe Maths — Term 2 (Grade 10 (2025))` |
| `School Maths — Term N (Grade X (YYYY))` | `School Maths — Term 1 (Grade 9 (2024))` |
| `Melisizwe Science — Term N (Grade X (YYYY))` | `Melisizwe Science — Term 3 (Grade 11 (2026))` |
| `School Science — Term N (Grade X (YYYY))` | `School Science — Term 4 (Grade 10 (2025))` |
| `Melisizwe Maths Baseline (Grade X (YYYY))` | Baseline, assessment_type=`other` |
| `Application Mark — Mathematics (Grade X (YYYY))` | assessment_type=`quiz` |
| `June Maths Assignment (Grade X (YYYY))` | assessment_type=`assignment`, term=2 |

**Term → date mapping:**
- Baseline → Feb 10 · Term 1 → Apr 10 · Term 2 → Jun 30 · Term 3 → Sep 12 · Term 4 → Nov 20

**Import script:** `scripts/import_marks.py` — re-runs a clean import from the Sage mark sheet.
Source files: `C:\Users\User\Downloads\Sage Girls in STEM - Mark Sheet.xlsx` and `GirlsSTEM_Learner_Matching_Report.xlsx`

**Learner codes:** LRN001–LRN019 = Grade 10 cohort, LRN020–LRN046 = Grade 11 cohort, LRN047–LRN065 = previously unmatched learners now in DB.

---

## Design System

All dashboard pages use DS tokens from `@/components/platform/tokens`.
Never use hardcoded Tailwind color classes in dashboard components — always use `DS.*` inline styles or CSS variables:

```ts
import { DS } from '@/components/platform/tokens';
// DS.surface, DS.border, DS.text, DS.textMid, DS.textMuted
// DS.primary, DS.primaryLight, DS.primaryBorder
// var(--ds-success), var(--ds-danger), var(--ds-warn)
// var(--ds-success-light), var(--ds-danger-light), var(--ds-warn-light)
```

---

## Environment Variables — Vercel Production

All set and verified:

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set (new sb_secret_ format) |
| `NEXT_PUBLIC_APP_URL` | ✅ `https://girls-stem-dashboard.vercel.app` |
| `RESEND_API_KEY` | ✅ Set — emails active |
| `CRON_SECRET` | ✅ Set — crons authenticated |

No `.env.local` file exists locally — all vars live on Vercel only.
Pull with `npx vercel env pull .env.local` to restore locally.

---

## Admin Accounts

| Email | Name | Role |
|-------|------|------|
| `admin@melisizwe.co.za` | Admin User | admin |
| `aldrid@melisizwe.co.za` | Aldrid | admin |
| `aldridmcanda@gmail.com` | Aldrid McAnda | admin |
| `carmen@melisizwe.co.za` | Carmen | instructor |

---

## Cron Jobs (vercel.json)

| Schedule | Path | Purpose |
|----------|------|---------|
| `0 7 * * *` | `/api/cron/mentorship-cadence` | Daily — notify mentors of at-risk learners with no session in 14+ days |
| `0 7 * * 1` | `/api/cron/risk-digest` | Weekly (Mon) — email admins a risk summary by school |

All crons require `Authorization: Bearer $CRON_SECRET` header (Vercel sends this automatically).

---

## Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/v1/interventions` | POST | Create intervention |
| `/api/v1/interventions/auto-flag` | POST | Bulk-create for at-risk learners with no open intervention |
| `/api/v1/interventions/[id]/escalate` | POST | Bump priority, notify assignee |
| `/api/v1/mentorship` | GET/POST | Sessions CRUD |
| `/api/v1/mentorship/goals` | POST | Create standalone goal |
| `/api/v1/risk/recalculate` | POST | Trigger calculate_risk_scores() |
| `/api/v1/attendance/bulk` | POST | Bulk-save a session's attendance |
| `/api/v1/attendance/history` | GET | Filtered attendance records |
| `/api/v1/attendance/[id]` | PATCH | Edit single attendance record (status + notes) |
| `/api/v1/assessments` | GET/POST | List / create assessment records |
| `/api/v1/assessments/[id]` | GET/PATCH/DELETE | Fetch, edit score/date, or delete a record |
| `/api/v1/reports/learner/[id]` | GET | HTML learner report (print-ready, opens in browser) |

All API routes have `export const dynamic = 'force-dynamic'`.

---

## Page & Feature Status

### ✅ Complete
| Page / Feature | Notes |
|----------------|-------|
| `/dashboard` | Alerts banner, Recharts area chart, quick actions |
| `/interventions` | Dark theme, bulk actions, escalation, auto-flag, email |
| `/mentorship` | Dark theme, filters, trend chart, goals, follow-up queue, cadence cron |
| `/risk` | Dark theme, analytics panel, inline/bulk interventions, weekly digest |
| `/reports` | Dark theme, charts, search filters, export previews |
| `/learners` | Dark theme, DS badges, DS pagination |
| `/learners/[id]` | Grouped assessments by grade year → term (matrix), inline edit/add marks, always shown even for new learners |
| `/attendance` | Dark theme form + history; inline edit of individual attendance records |
| `/assessments/bulk` | Grade tabs; structured Source/Subject/Category picker matching learner profile labels; auto-fills date per term |
| `/api/v1/reports/learner/[id]` | HTML report with Option A matrix table: Maths/Science × Melisizwe/School per term, trend arrows, subject avg footer |
| `middleware.ts` | Security: `getUser()` (not `getSession()`), allowlist per role |

### ✅ All pages on dark theme (DS tokens) — including teacher + sponsor portals

---

## Assessment UI Patterns

### Learner profile (`/learners/[id]`)
- `AssessmentsClient.tsx` — Client Component, handles grouping + inline edit/add
- Chips show %, grade band, raw score; greyed-out + icon for missing marks
- Clicking a chip opens `EditPanel` — PATCH existing or POST new
- All 4 terms always rendered per grade year (empty = ready to fill)

### Bulk capture (`/assessments/bulk`)
- Source toggle (Melisizwe / School) + Subject toggle + Category toggle
- Category auto-fills date and generates the correct `notes` label
- "Will appear as" preview shows exact label before saving
- Grade tabs (Grade 9/10/11/12) filter the learner table

### Learner report (`/api/v1/reports/learner/[id]`)
- Matrix table per grade year: rows = term, columns = M.Maths | S.Maths | M.Science | S.Science | Avg
- Trend arrows on Avg column (↑ improving ↓ declining = stable vs previous term)
- Subject Avg footer row with mini progress bars
- Print-safe white background, opens directly in browser for Print/Save PDF

---

## Known Gaps / TODO

- [ ] **Vercel GitHub integration not linked** — deploys require `npx vercel deploy --prod` manually.
- [ ] **Misplaced duplicate files** — `components/app/` and `components/components/` contain files in wrong directories.
- [ ] **`proxy.ts` at root** — unclear purpose, needs investigation.

---

## Enterprise Audit — June 2026

**Overall Score: 64/100 | Product Maturity: Beta**
Full report generated by Claude Sonnet 4.6, June 2026.

### 🔴 Critical (fix before any school launch)

| # | Issue | Status |
|---|-------|--------|
| C1 | **RLS disabled on ALL 23 tables** — anon key can read/write any data | ❌ Open |
| C2 | **`ignoreBuildErrors: true`** — TypeScript errors silently suppressed | ❌ Open |
| C3 | **Debug routes in production** — `/api/debug-cookies`, `/api/debug-pending`, `/api/debug-sponsors` | ❌ Open |
| C4 | **`allowedOrigins` only includes localhost** — production domain missing from Server Actions config | ❌ Open |
| C5 | **Parent portal is a stub** — registered parents have nowhere to go | ❌ Open |

### 🟡 Medium (fix within 30 days)

| # | Issue | Status |
|---|-------|--------|
| M1 | No audit log table — can't track who changed what (POPIA compliance risk) | ❌ Open |
| M2 | No rate limiting on auth or API routes | ❌ Open |
| M3 | No manual notification creation — admins can't send custom alerts | ❌ Open |
| M4 | No programme enrolment UI — requires DB access to enrol learners | ❌ Open |
| M5 | `pg_cron` not scheduled — risk scores only recalc on save events | ❌ Open |
| M6 | Attendance rounds 84.62% → 85% (should floor, not round) | ❌ Open |
| M7 | No school management UI (create/edit schools) | ❌ Open |
| M8 | No bulk learner report export | ❌ Open |
| M9 | Analytics has no date range filter or CSV export | ❌ Open |
| M10 | `console.log` in 19 production files — potential data leakage | ❌ Open |

### 🟢 Low / Technical Debt

| # | Issue | Status |
|---|-------|--------|
| T1 | 4 unused DB tables: `assessment_feedback`, `assessment_templates`, `learner_skill_scores`, `meeting_ratings` | ❌ Open |
| T2 | Zero test coverage — no unit, integration, or e2e tests | ❌ Open |
| T3 | Accessibility: missing aria-labels, focus traps, screen reader support | ❌ Open |
| T4 | No CSP / HSTS security headers | ❌ Open |
| T5 | `any` used heavily in TypeScript — interfaces incomplete | ❌ Open |

### Security Findings
- **RLS:** All 23 tables have `rowsecurity = false` — anyone with the anon key can access all data
- **Auth:** Middleware correctly uses `getUser()` not `getSession()` ✅
- **Role isolation:** Middleware correctly enforces portal separation ✅
- **OWASP risk:** SQL injection not possible (parameterised queries via Supabase SDK) ✅

### Engineering Scores
| Dimension | Score |
|-----------|-------|
| Code quality | 60/100 |
| Architecture | 70/100 |
| API design | 72/100 |
| Database schema | 68/100 |
| Security | 30/100 |
| TypeScript quality | 45/100 |
| Test coverage | 0/100 |
| **Overall** | **58/100** |

### 30-Day Fix Priority Order
1. Remove debug routes (5 min)
2. Fix `allowedOrigins` for production (5 min)
3. Schedule pg_cron (5 min)
4. Fix attendance rounding (10 min)
5. Add CSP/HSTS headers (20 min)
6. Enable RLS on all tables (2–4 hrs)
7. Remove `ignoreBuildErrors` + fix TS errors (2–4 hrs)
8. Remove console.logs (1 hr)
9. Build parent portal or disable parent registration (1 hr)
10. Add audit log table (2 hrs)
11. Build programme enrolment UI
12. Add rate limiting
13. Accessibility pass

---

## Diagnostics

```
https://girls-stem-dashboard.vercel.app/api/diagnostics
```
