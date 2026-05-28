-- ════════════════════════════════════════════════════════════════════════
-- Migration 006 — Notifications
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  learner_id      UUID        REFERENCES learners(learner_id) ON DELETE CASCADE,
  type            TEXT        NOT NULL, -- 'absence','low_score','intervention','risk','mentorship','project_feedback'
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  is_read         BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_learner ON notifications(learner_id);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

SELECT 'Migration 006 complete' AS status;
