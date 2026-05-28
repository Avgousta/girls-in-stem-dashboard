-- ════════════════════════════════════════════════════════════════════════
-- Migration 004 — Sponsor Management
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════

-- ── Sponsors table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsors (
  sponsor_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name  TEXT NOT NULL,
  logo_url      TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Link sponsors to learners ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsor_learners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id  UUID NOT NULL REFERENCES sponsors(sponsor_id) ON DELETE CASCADE,
  learner_id  UUID NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT,
  UNIQUE (sponsor_id, learner_id)
);

-- ── Link sponsors to users (the sponsor portal login) ─────────────────────
-- A sponsor organisation can have multiple user logins
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES sponsors(sponsor_id) ON DELETE SET NULL;

-- ── Add 'sponsor' to user_role enum ──────────────────────────────────────
-- If user_role is an enum type, alter it; otherwise skip
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sponsor';
  END IF;
END $$;

-- ── Seed real sponsors ────────────────────────────────────────────────────
INSERT INTO sponsors (sponsor_name, contact_email, is_active) VALUES
  ('Honeywell',  'honeywell@girlsinstem.co.za',  true),
  ('E4',         'e4@girlsinstem.co.za',          true),
  ('Sage',       'sage@girlsinstem.co.za',        true)
ON CONFLICT DO NOTHING;

-- ── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sponsor_learners_sponsor ON sponsor_learners(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_learners_learner ON sponsor_learners(learner_id);
CREATE INDEX IF NOT EXISTS idx_users_sponsor_id         ON users(sponsor_id);

-- ── Disable RLS ───────────────────────────────────────────────────────────
ALTER TABLE sponsors         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_learners DISABLE ROW LEVEL SECURITY;

SELECT 'Migration 004 complete — sponsors created' AS status;
