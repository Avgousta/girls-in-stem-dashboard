-- ════════════════════════════════════════════════════════════════════════
-- Migration 005 — Project Stages, Feedback & Bulk Assessments
-- ════════════════════════════════════════════════════════════════════════

-- ── Extend projects table ─────────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS stage         TEXT NOT NULL DEFAULT 'planning'
    CHECK (stage IN ('planning','in_progress','review','submitted','marked')),
  ADD COLUMN IF NOT EXISTS due_date      DATE,
  ADD COLUMN IF NOT EXISTS rubric_score  JSONB,   -- { criteria: score } map
  ADD COLUMN IF NOT EXISTS file_url      TEXT,    -- learner submission link
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ;

-- ── Project feedback ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_feedback (
  feedback_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  body         TEXT        NOT NULL,
  is_private   BOOLEAN     NOT NULL DEFAULT false, -- private = instructor only
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Assessment templates (for bulk capture) ───────────────────────────
CREATE TABLE IF NOT EXISTS assessment_templates (
  template_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID        REFERENCES programs(program_id) ON DELETE CASCADE,
  subject      TEXT        NOT NULL,
  max_score    NUMERIC(6,2) NOT NULL DEFAULT 100,
  assessment_date DATE,
  created_by   UUID        REFERENCES users(user_id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_project_feedback_project ON project_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage           ON projects(stage);
CREATE INDEX IF NOT EXISTS idx_projects_learner         ON projects(learner_id);

-- ── Disable RLS ───────────────────────────────────────────────────────
ALTER TABLE project_feedback      DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates  DISABLE ROW LEVEL SECURITY;

SELECT 'Migration 005 complete' AS status;
