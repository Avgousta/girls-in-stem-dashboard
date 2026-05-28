# Girls in STEM Dashboard — CLAUDE.md

## Project Overview

A full-stack STEM education management platform for South African schools. Built with Next.js 16 (App Router), Supabase (PostgreSQL + Auth), Tailwind CSS, and TypeScript.

**Working directory:** `C:\Users\User\documents\girlsinstem`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table v8 |
| Database | Supabase (PostgreSQL 17) |
| Auth | Supabase Auth + RLS |
| Email | Resend (API key not yet set) |
| Deployment | Vercel |

### Commands
```bash
npm run dev        # http://localhost:3000
npm run build
npm run type-check # tsc --noEmit
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

All 23 tables are live in the `public` schema:

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
| `mentorship_goals` | Learner goals set with mentor |
| `interventions` | At-risk learner flags |
| `intervention_updates` | Progress notes on interventions |
| `risk_scores` | Auto-calculated risk per learner |
| `notifications` | In-app notifications |
| `sponsors` | Sponsor organisations |
| `sponsor_learners` | Sponsor ↔ learner links |
| `online_meetings` / `meetings` | Scheduled meetings |
| `meeting_ratings` | Meeting feedback |
| `assessment_templates` | Reusable assessment templates |
| `assessment_feedback` | Feedback on assessments |
| `learner_skill_scores` | Skill-level tracking |

### Database Functions
All live in `public` schema:

- `calculate_risk_scores()` — upserts risk level per active learner
- `current_user_role()` — returns role for `auth.uid()`
- `get_dashboard_stats()` — KPI aggregates for dashboard
- `get_attendance_trend()` — weekly attendance for last 12 weeks
- `get_score_distribution()` — grade band breakdown
- `get_school_comparison()` — per-school attendance + score averages
- `set_grade_band()` — trigger on assessments (Distinction/Merit/Pass/Needs Support)

### Migrations (tracked)
| Version | Name |
|---------|------|
| 20260101000001 | 001_initial_schema |
| 20260101000002 | 002_analytics_functions |

> Both were applied manually before tracking was set up. Registered in `supabase_migrations.schema_migrations` on 2026-05-28.

---

## Environment Variables (`.env.local`)

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Set |
| `NEXT_PUBLIC_APP_URL` | Set (`http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Set |
| `RESEND_API_KEY` | **NOT SET** — email features will fail |
| `CRON_SECRET` | **NOT SET** — still placeholder |

---

## Known Gaps / TODO

- [ ] **`middleware.ts` missing** — no edge-level auth guard. Route protection currently relies on `requireAuth()` in layout components only.
- [ ] **`RESEND_API_KEY` not set** — all email (notifications, invites) silently fails.
- [ ] **`CRON_SECRET` is placeholder** — replace with a real random string before deploying.
- [ ] **`pg_cron` not scheduled** — risk recalculation every 6h needs this SQL run in Supabase:
  ```sql
  SELECT cron.schedule('risk-scores', '0 */6 * * *', 'SELECT calculate_risk_scores()');
  ```
- [ ] **Misplaced duplicate files** — `components/app/` and `components/components/` contain files placed in the wrong directory. They duplicate files already in `app/` and `components/`.
- [ ] **`proxy.ts` at root** — unclear purpose, needs investigation.
- [ ] **No admin user exists yet** — need to create one in Supabase Auth + insert into `users` table with `role = 'admin'`.

---

## Diagnostics

Hit this endpoint after `npm run dev` to verify Supabase connectivity:
```
http://localhost:3000/api/diagnostics
```
