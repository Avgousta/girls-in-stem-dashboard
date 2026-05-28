-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 010 — Assessment Intelligence System Upgrade
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extend assessments table ─────────────────────────────────────────────────
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS assessment_type  TEXT NOT NULL DEFAULT 'test'
    CHECK (assessment_type IN ('quiz','test','project','practical','assignment','oral','other')),
  ADD COLUMN IF NOT EXISTS difficulty       TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','hard','advanced')),
  ADD COLUMN IF NOT EXISTS skill_tags       TEXT[],        -- e.g. ARRAY['logic','syntax','debugging']
  ADD COLUMN IF NOT EXISTS notes            TEXT,          -- instructor notes on this result
  ADD COLUMN IF NOT EXISTS feedback_strengths     TEXT,
  ADD COLUMN IF NOT EXISTS feedback_improvements  TEXT,
  ADD COLUMN IF NOT EXISTS feedback_actions       TEXT,
  ADD COLUMN IF NOT EXISTS term             SMALLINT,      -- school term 1–4
  ADD COLUMN IF NOT EXISTS weighting        NUMERIC(4,2) DEFAULT 1.0;  -- relative weight

-- ── Assessment feedback table (structured, per-assessment) ───────────────────
CREATE TABLE IF NOT EXISTS assessment_feedback (
  feedback_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID        NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
  instructor_id   UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  strengths       TEXT,
  improvements    TEXT,
  recommended_actions TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id)
);
ALTER TABLE assessment_feedback DISABLE ROW LEVEL SECURITY;

-- ── Skill mastery summary (materialised per learner + skill) ────────────────
CREATE TABLE IF NOT EXISTS learner_skill_scores (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  UUID        NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  skill_tag   TEXT        NOT NULL,
  avg_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  attempts    SMALLINT    NOT NULL DEFAULT 0,
  last_score  NUMERIC(5,2),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (learner_id, skill_tag)
);
CREATE INDEX IF NOT EXISTS idx_skill_scores_learner ON learner_skill_scores(learner_id);
ALTER TABLE learner_skill_scores DISABLE ROW LEVEL SECURITY;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assessments_type    ON assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessments_skill   ON assessments USING GIN(skill_tags);
CREATE INDEX IF NOT EXISTS idx_assessments_term    ON assessments(term);

SELECT 'Migration 010 complete' AS status;
