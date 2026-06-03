-- ════════════════════════════════════════════════════════════════════════
-- Migration 008 — Enhanced Student Profiles & Meeting Ratings
-- ════════════════════════════════════════════════════════════════════════

-- Add personal fields to learner_profiles
ALTER TABLE learner_profiles
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS interests    TEXT[],   -- array of interest tags
  ADD COLUMN IF NOT EXISTS hobbies      TEXT[],
  ADD COLUMN IF NOT EXISTS aspiration   TEXT,     -- "I want to be a..."
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,     -- already exists, keep
  ADD COLUMN IF NOT EXISTS cover_color  TEXT DEFAULT '#4F2D7F'; -- profile card accent

-- Meeting ratings
CREATE TABLE IF NOT EXISTS meeting_ratings (
  rating_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID        NOT NULL REFERENCES online_meetings(meeting_id) ON DELETE CASCADE,
  learner_id   UUID        NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meeting_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_ratings_meeting ON meeting_ratings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_ratings_learner ON meeting_ratings(learner_id);

ALTER TABLE meeting_ratings DISABLE ROW LEVEL SECURITY;

SELECT 'Migration 008 complete' AS status;
