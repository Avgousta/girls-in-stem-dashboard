-- Migration 022: learner re-engagement outreach log
-- Tracks automated re-engagement contacts so we don't over-contact a learner
-- and can see which outreach was responded to.

CREATE TABLE IF NOT EXISTS learner_reengagement (
  reengagement_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID        NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  trigger_reason  TEXT        NOT NULL,  -- 'consecutive_absences' | 'no_pulse' | 'risk_trajectory'
  trigger_detail  TEXT,                  -- human-readable detail, e.g. "4 consecutive absences"
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,           -- set when coordinator marks as responded
  response_notes  TEXT
);

CREATE INDEX idx_reengagement_learner ON learner_reengagement(learner_id);
CREATE INDEX idx_reengagement_sent    ON learner_reengagement(sent_at DESC);

ALTER TABLE learner_reengagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_reengagement"  ON learner_reengagement FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_write_reengagement" ON learner_reengagement FOR ALL TO service_role USING (true) WITH CHECK (true);
