-- Migration 023: peer support pairing
-- Links a high-performing learner (tutor) with an at-risk learner (mentee)
-- within the same programme. Status tracks the lifecycle of each pairing.

CREATE TABLE IF NOT EXISTS peer_support_pairs (
  pair_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id      UUID        NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  mentee_id     UUID        NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  program_id    UUID        REFERENCES programs(program_id) ON DELETE SET NULL,
  status        TEXT        NOT NULL DEFAULT 'suggested'
                            CHECK (status IN ('suggested','active','paused','ended')),
  created_by    UUID        REFERENCES users(user_id) ON DELETE SET NULL,
  notes         TEXT,
  started_at    DATE,
  ended_at      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, mentee_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_pairs_tutor   ON peer_support_pairs(tutor_id);
CREATE INDEX IF NOT EXISTS idx_peer_pairs_mentee  ON peer_support_pairs(mentee_id);
CREATE INDEX IF NOT EXISTS idx_peer_pairs_program ON peer_support_pairs(program_id);
CREATE INDEX IF NOT EXISTS idx_peer_pairs_status  ON peer_support_pairs(status);

ALTER TABLE peer_support_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_peer_pairs"     ON peer_support_pairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_all_peer_pairs"   ON peer_support_pairs FOR ALL    TO service_role  USING (true) WITH CHECK (true);
