-- ════════════════════════════════════════════════════════════════════════
-- Migration 009 — Interventions & Mentorship System Upgrade
-- ════════════════════════════════════════════════════════════════════════

-- ── Extend interventions ─────────────────────────────────────────────
ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS intervention_type TEXT NOT NULL DEFAULT 'academic'
    CHECK (intervention_type IN ('academic','attendance','behavioural','personal','technical','other')),
  ADD COLUMN IF NOT EXISTS priority          TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS assigned_to       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_plan       TEXT,
  ADD COLUMN IF NOT EXISTS due_date          DATE,
  ADD COLUMN IF NOT EXISTS resolved_notes    TEXT,
  ADD COLUMN IF NOT EXISTS linked_session_id UUID REFERENCES mentorship_sessions(session_id) ON DELETE SET NULL;

-- ── Intervention updates log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intervention_updates (
  update_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID        NOT NULL REFERENCES interventions(intervention_id) ON DELETE CASCADE,
  author_id       UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  note            TEXT        NOT NULL,
  status_change   TEXT,       -- e.g. 'open → in_progress'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interv_updates ON intervention_updates(intervention_id);
ALTER TABLE intervention_updates DISABLE ROW LEVEL SECURITY;

-- ── Extend mentorship_sessions ───────────────────────────────────────
ALTER TABLE mentorship_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'check_in'
    CHECK (session_type IN ('check_in','goal_review','academic_support','career','pastoral','other')),
  ADD COLUMN IF NOT EXISTS goals_discussed   TEXT,
  ADD COLUMN IF NOT EXISTS learner_mood      SMALLINT CHECK (learner_mood BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS outcome           TEXT
    CHECK (outcome IN ('positive','neutral','needs_follow_up') OR outcome IS NULL),
  ADD COLUMN IF NOT EXISTS intervention_id   UUID REFERENCES interventions(intervention_id) ON DELETE SET NULL;

-- ── Mentorship goals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentorship_goals (
  goal_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  UUID        NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  mentor_id   UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  target_date DATE,
  status      TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','abandoned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_learner ON mentorship_goals(learner_id);
CREATE INDEX IF NOT EXISTS idx_goals_mentor  ON mentorship_goals(mentor_id);
ALTER TABLE mentorship_goals DISABLE ROW LEVEL SECURITY;

-- ── Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interv_assigned  ON interventions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_interv_priority  ON interventions(priority);
CREATE INDEX IF NOT EXISTS idx_sessions_outcome ON mentorship_sessions(outcome);

SELECT 'Migration 009 complete' AS status;
