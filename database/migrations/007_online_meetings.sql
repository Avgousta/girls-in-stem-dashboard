-- ════════════════════════════════════════════════════════════════════════
-- Migration 007 — Online Meetings / Virtual Classes
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS online_meetings (
  meeting_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  program_id    UUID        REFERENCES programs(program_id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  meeting_url   TEXT        NOT NULL,   -- Zoom/Meet/Teams/etc link
  platform      TEXT        NOT NULL DEFAULT 'other', -- zoom | meet | teams | other
  scheduled_at  TIMESTAMPTZ NOT NULL,   -- exact date + time
  duration_min  SMALLINT    NOT NULL DEFAULT 60,
  is_cancelled  BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_instructor ON online_meetings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_meetings_program    ON online_meetings(program_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled  ON online_meetings(scheduled_at);

ALTER TABLE online_meetings DISABLE ROW LEVEL SECURITY;

SELECT 'Migration 007 complete — online_meetings table created' AS status;
