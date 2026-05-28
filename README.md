# Girls in STEM Digital Platform

A production-ready, full-stack SaaS application for managing STEM education programs for girls across South African schools. Built with Next.js 14, Supabase (PostgreSQL), TypeScript, and TailwindCSS.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time KPIs, charts, and high-risk learner alerts |
| **Learner Management** | CRUD profiles, search, filter, paginate |
| **Attendance Register** | Auto-loads enrolled learners by programme |
| **Assessments** | Score capture with auto grade band calculation |
| **Mentorship** | Session logging with notes and next steps |
| **Interventions** | Flag and track at-risk learner support actions |
| **Risk Monitor** | Automatic risk scoring (attendance + score thresholds) |
| **Role Portals** | Admin · Instructor · Learner · Parent |
| **Analytics** | Attendance trends, score distribution, school comparison |

---

## 🏗 Architecture

```
Next.js 14 (App Router)   →   Supabase (PostgreSQL + Auth + RLS)
     ↓                              ↓
Vercel Edge Network         Row Level Security policies
Serverless API routes       pg_cron risk recalculation
React Server Components     Realtime subscriptions (future)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| API | Next.js Route Handlers (serverless) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth + JWT + RBAC |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Deployment | Vercel + Supabase |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

### Step 1 — Clone and install
```bash
git clone https://github.com/your-org/girls-in-stem-platform.git
cd girls-in-stem-platform
npm install
```

### Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
4. Fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=run: openssl rand -base64 32
```

### Step 3 — Run database migrations

In your Supabase project → **SQL Editor**, run in order:
1. `database/migrations/001_initial_schema.sql`
2. `database/migrations/002_analytics_functions.sql`

### Step 4 — Create demo users

In Supabase → **Authentication → Users** → Add User, create:
- `admin@girlsstem.org` (password of your choice)
- `instructor@girlsstem.org`

Then in **SQL Editor**:
```sql
-- Replace <uid-1> and <uid-2> with the UUIDs shown in Supabase Auth Users
INSERT INTO users (user_id, email, full_name, role) VALUES
  ('<uid-1>', 'admin@girlsstem.org',      'Platform Admin',   'admin'),
  ('<uid-2>', 'instructor@girlsstem.org', 'Thandi Dlamini',   'instructor');
```

Then seed the demo schools:
```bash
-- Run database/seeds/demo_data.sql in SQL Editor
```

### Step 5 — Run locally
```bash
npm run dev
# Open http://localhost:3000
# Login: admin@girlsstem.org
```

---

## 📁 Project Structure

```
/app
  /(auth)/login/          # Login page
  /(dashboard)/           # Protected routes (sidebar layout)
    dashboard/            # Main dashboard with KPIs + charts
    learners/             # Learner list + [id] profile
    programs/             # Programme cards + [id] detail
    attendance/           # Bulk attendance register
    assessments/          # Assessment capture + history
    mentorship/           # Mentorship session logging
    interventions/        # Intervention tracking
    risk/                 # Risk monitor dashboard
    learner/              # Learner self-service portal
    parent/               # Parent portal
    admin/                # Admin-only: users, schools
  /api/v1/               # REST API route handlers
    learners/             # GET, POST, [id] PATCH/DELETE
    programs/             # GET, POST, [id]/learners
    attendance/           # GET, POST, bulk/
    assessments/          # GET, POST
    mentorship/           # GET, POST
    interventions/        # GET, POST, [id] PATCH
    dashboard/            # stats/, risk/, charts/
    risk/recalculate/     # POST — trigger risk engine
  auth/callback/          # Supabase OAuth callback

/components
  /charts/                # ChartCard, Charts (all Recharts)
  /forms/                 # AttendanceForm, AssessmentForm, etc.
  /layout/                # SidebarNavigation, TopBar
  /tables/                # DataTable (sortable, paginated, searchable)
  /ui/                    # Badge, DashboardStatsCard, RiskAlertCard

/lib
  /supabase/              # client.ts (browser), server.ts (SSR + admin)
  /auth/                  # requireAuth, RBAC helpers

/database
  /migrations/            # SQL migration files (run in order)
  /seeds/                 # Demo data

/types/index.ts           # All TypeScript interfaces and enums
/utils/index.ts           # cn, fmt, calcGradeBand, calcRiskLevel, etc.
/middleware.ts            # Edge auth guard + role redirect
```

---

## 🔐 Role Permissions

| Feature | Admin | Instructor | Learner | Parent |
|---------|-------|------------|---------|--------|
| View all learners | ✅ | ✅ | Own only | Child only |
| Add/edit learners | ✅ | ❌ | ❌ | ❌ |
| Mark attendance | ✅ | ✅ | ❌ | ❌ |
| Record assessments | ✅ | ✅ | ❌ | ❌ |
| Log mentorship | ✅ | ✅ | ❌ | ❌ |
| Flag interventions | ✅ | ✅ | ❌ | ❌ |
| View risk dashboard | ✅ | ✅ | ❌ | ❌ |
| Manage programs | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ❌ | ❌ |

---

## ⚠️ Risk Intelligence Engine

Learners are automatically scored every 6 hours via `pg_cron`:

| Level | Condition |
|-------|-----------|
| 🔴 HIGH | Attendance < 75% **OR** Avg score < 50% |
| 🟡 MEDIUM | Attendance 75–84% **OR** Avg score 50–59% |
| 🟢 LOW | Attendance ≥ 85% **AND** Avg score ≥ 60% |

Manual recalculation: `POST /api/v1/risk/recalculate`

---

## 🌍 Deployment (Vercel + Supabase)

### 1. Push to GitHub
```bash
git add . && git commit -m "Initial platform setup"
git push origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Import Repository
2. Framework: **Next.js** (auto-detected)
3. Add all environment variables from `.env.example`
4. Deploy

### 3. Configure Supabase for production
In Supabase → **Authentication → URL Configuration**:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback`

### 4. Enable pg_cron for risk scoring
In Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'risk-scores-every-6h',
  '0 */6 * * *',
  'SELECT calculate_risk_scores()'
);
```

---

## 🧪 API Reference

### Authentication
All API routes require a Supabase JWT Bearer token:
```
Authorization: Bearer <supabase-session-token>
```

### Key Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/learners` | admin, instructor | List learners (paginated) |
| POST | `/api/v1/learners` | admin | Register learner |
| GET | `/api/v1/learners/:id` | any | Learner profile |
| PATCH | `/api/v1/learners/:id` | admin | Update learner |
| GET | `/api/v1/programs` | any | List programmes |
| POST | `/api/v1/programs` | admin | Create programme |
| GET | `/api/v1/programs/:id/learners` | admin, instructor | Enrolled learners |
| GET | `/api/v1/attendance` | any | Attendance records |
| POST | `/api/v1/attendance` | instructor | Single record |
| POST | `/api/v1/attendance/bulk` | instructor | Full session register |
| GET | `/api/v1/assessments` | any | Assessment records |
| POST | `/api/v1/assessments` | instructor | Record score |
| GET | `/api/v1/mentorship` | any | Sessions |
| POST | `/api/v1/mentorship` | instructor | Log session |
| GET | `/api/v1/interventions` | admin, instructor | Interventions |
| POST | `/api/v1/interventions` | admin, instructor | Flag intervention |
| PATCH | `/api/v1/interventions/:id` | admin, instructor | Update status |
| GET | `/api/v1/dashboard/stats` | admin, instructor | KPI aggregates |
| GET | `/api/v1/dashboard/risk` | admin, instructor | Risk learner list |
| GET | `/api/v1/dashboard/charts` | admin, instructor | Chart data |
| POST | `/api/v1/risk/recalculate` | admin, instructor | Trigger risk engine |

### Pagination
All list endpoints support: `?page=1&limit=20&search=...`

Response format:
```json
{
  "data": [...],
  "error": null,
  "meta": { "total": 150, "page": 1, "limit": 20, "totalPages": 8 }
}
```

---

## 📊 Scalability Notes

- **Database**: PostgreSQL with indexes on all FK and filter columns. Partial indexes for active records. pg_cron for background jobs.
- **API**: Serverless functions — auto-scale on Vercel. Rate-limited at 100 req/min per IP.
- **Security**: Row Level Security enforced at DB layer — bypassing the API layer is impossible.
- **Multi-tenancy**: Shared schema, isolated by `school_id` RLS policies.
- **Capacity**: Designed for 10,000+ learners, 500+ schools, 50+ concurrent programmes.

---

## 📝 License

Proprietary — Girls in STEM Organisation. All rights reserved.
