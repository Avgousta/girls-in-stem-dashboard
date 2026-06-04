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
| Deployment | Vercel (CLI v54 — `vercel --prod` to deploy) |

### Commands
```bash
npm run dev        # http://localhost:3000
npm run build
npm run type-check # tsc --noEmit
vercel --prod      # deploy to production
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

All 23 tables live in the `public` schema. Key tables:

| Table | Purpose |
|-------|---------|
| `schools` | School registry |
| `users` | Platform users (mirrors auth.users) |
| `learners` | Learner records |
| `learner_profiles` | Extended learner info (1:1) |
| `programs` | STEM programmes |
| `program_enrollments` | Learner ↔ programme links |
| `attendance` | Session attendance records |
| `assessments` | Assessment scores (auto grade_band via trigger) |
| `projects` | Learner projects |
| `project_feedback` | Instructor feedback on projects |
| `mentorship_sessions` | Mentorship session logs |
| `mentorship_goals` | Goals set with mentor (`progress` int 0–100 added) |
| `interventions` | At-risk learner flags |
| `intervention_updates` | Progress notes on interventions |
| `risk_scores` | Auto-calculated risk per learner |
| `notifications` | In-app notifications |
| `sponsors` | Sponsor organisations |
| `sponsor_learners` | Sponsor ↔ learner links |

### Migrations applied
| Version | Name |
|---------|------|
| 20260101000001 | 001_initial_schema |
| 20260101000002 | 002_analytics_functions |
| (manual) | add_progress_to_mentorship_goals — `progress int NOT NULL DEFAULT 0 CHECK (0–100)` |

---

## Design System

All dashboard pages use DS tokens from `@/components/platform/tokens` and
`@/components/platform/PlatformComponents`. Never use hardcoded Tailwind
color classes (`bg-white`, `text-gray-*`, `border-gray-*`) in dashboard
components — always use `DS.*` inline styles or CSS variables:

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
Pull with `vercel env pull .env.local` to restore locally.

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

All API routes have `export const dynamic = 'force-dynamic'` (prevents static pre-render warnings).

---

## Page Upgrade Status

### ✅ Complete (dark theme + features)
| Page | Notes |
|------|-------|
| `/dashboard` | Alerts banner, Recharts area chart, quick actions |
| `/interventions` | Ph1–3: dark theme, bulk actions, escalation, auto-flag, email |
| `/mentorship` | Ph1–3: dark theme, filters, trend chart, goals, follow-up queue, cadence cron |
| `/risk` | Ph1–3: dark theme, analytics panel, inline/bulk interventions, weekly digest |
| `/reports` | Ph1–2: dark theme, charts, search filters, export previews |
| `/learners` | Dark theme, DS badges, DS pagination |
| `/learners/[id]` | Dark theme profile, mentorship sessions section added |
| `/attendance` | Dark theme form + history, DS status/grade colours |
| `middleware.ts` | Security: `getUser()` (not `getSession()`), allowlist per role |

### ⏳ Still light-themed
- `/assessments` + `/assessments/bulk`
- `/projects` + `/projects/[id]`
- `/programs` + `/programs/[id]`
- `/admin/users`, `/admin/schools`, `/admin/sponsors`, `/admin/approvals`
- `/learners/bulk`

---

## Known Gaps / TODO

- [ ] **Remaining light-themed pages** — see table above
- [ ] **`pg_cron` not scheduled** — risk recalculation every 6h:
  ```sql
  SELECT cron.schedule('risk-scores', '0 */6 * * *', 'SELECT calculate_risk_scores()');
  ```
- [ ] **Misplaced duplicate files** — `components/app/` and `components/components/` contain files in the wrong directory.
- [ ] **`proxy.ts` at root** — unclear purpose, needs investigation.

---

## Diagnostics

```
https://girls-stem-dashboard.vercel.app/api/diagnostics
```
