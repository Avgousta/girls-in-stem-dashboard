-- ════════════════════════════════════════════════════════════════════════
-- Migration 003 — Self-registration support
-- Run in Supabase SQL Editor after migrations 001 and 002
-- ════════════════════════════════════════════════════════════════════════

-- Ensure users.is_active exists and defaults to true for admins
ALTER TABLE users
  ALTER COLUMN is_active SET DEFAULT true;

-- Ensure learners.user_id column exists for account linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learners' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE learners ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Index for fast learner lookup by user_id
CREATE INDEX IF NOT EXISTS idx_learners_user_id ON learners(user_id);

-- Index for fast learner lookup by learner_code (used at registration)
CREATE INDEX IF NOT EXISTS idx_learners_code ON learners(learner_code);

-- Disable RLS on users table so registration can write to it
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Confirm
SELECT 'Migration 003 complete' AS status;
