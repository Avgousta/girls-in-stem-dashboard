-- Migration 011: Trend-based early warning risk flags
--
-- Adds three new risk_flags to calculate_risk_scores():
--   consecutive_absences  — last 2 recorded sessions are both absent
--   declining_scores      — last 3 assessments show a strictly declining trend
--   no_recent_mentorship  — no mentorship session logged in the past 21 days
--
-- Risk level escalation rules (additive on top of existing thresholds):
--   ≥ 2 trend flags → 'high'
--   1 trend flag    → at minimum 'medium'

CREATE OR REPLACE FUNCTION calculate_risk_scores()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  WITH

  -- ── Existing: overall attendance rate + average score ──────────────────────
  base_stats AS (
    SELECT
      l.learner_id,
      COALESCE(
        ROUND(
          100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC
          / NULLIF(COUNT(a.*), 0),
          2
        ), 0
      ) AS attendance_rate,
      COALESCE(ROUND(AVG(asmt.percentage), 2), 0) AS avg_score
    FROM learners l
    LEFT JOIN attendance   a    ON a.learner_id    = l.learner_id
    LEFT JOIN assessments  asmt ON asmt.learner_id = l.learner_id
    WHERE l.programme_status = 'active'
    GROUP BY l.learner_id
  ),

  -- ── Trend 1: consecutive absences ─────────────────────────────────────────
  -- Flag when both of the learner's last 2 recorded sessions are absent.
  att_ranked AS (
    SELECT
      learner_id,
      status,
      ROW_NUMBER() OVER (PARTITION BY learner_id ORDER BY session_date DESC) AS rn
    FROM attendance
  ),
  consec_absent AS (
    SELECT
      learner_id,
      BOOL_AND(status = 'absent') AS flagged
    FROM att_ranked
    WHERE rn <= 2
    GROUP BY learner_id
    HAVING COUNT(*) = 2   -- only learners who have at least 2 sessions on record
  ),

  -- ── Trend 2: declining scores ──────────────────────────────────────────────
  -- Flag when the three most recent assessments are strictly decreasing.
  score_ranked AS (
    SELECT
      learner_id,
      percentage,
      ROW_NUMBER() OVER (PARTITION BY learner_id ORDER BY assessment_date DESC) AS rn
    FROM assessments
    WHERE percentage IS NOT NULL
  ),
  score_trend AS (
    SELECT
      s1.learner_id,
      (s1.percentage < s2.percentage AND s2.percentage < s3.percentage) AS flagged
    FROM       score_ranked s1
    JOIN score_ranked s2 ON s2.learner_id = s1.learner_id AND s2.rn = 2
    JOIN score_ranked s3 ON s3.learner_id = s1.learner_id AND s3.rn = 3
    WHERE s1.rn = 1
  ),

  -- ── Trend 3: no recent mentorship ─────────────────────────────────────────
  -- Flag when the learner's last mentorship session was > 21 days ago (or never).
  mentorship_recency AS (
    SELECT
      l.learner_id,
      (
        MAX(ms.session_date) IS NULL
        OR MAX(ms.session_date) < CURRENT_DATE - INTERVAL '21 days'
      ) AS flagged
    FROM learners l
    LEFT JOIN mentorship_sessions ms ON ms.learner_id = l.learner_id
    WHERE l.programme_status = 'active'
    GROUP BY l.learner_id
  )

  INSERT INTO risk_scores (learner_id, attendance_rate, avg_score, risk_level, risk_flags, last_calculated)
  SELECT
    bs.learner_id,
    bs.attendance_rate,
    bs.avg_score,

    -- Risk level: lagging thresholds + trend escalation
    CASE
      WHEN bs.attendance_rate < 75 OR bs.avg_score < 50 THEN 'high'
      WHEN (
        COALESCE(ca.flagged, FALSE)::INT
        + COALESCE(st.flagged, FALSE)::INT
        + COALESCE(mr.flagged, FALSE)::INT
      ) >= 2 THEN 'high'
      WHEN bs.attendance_rate < 85
        OR bs.avg_score        < 60
        OR COALESCE(ca.flagged, FALSE)
        OR COALESCE(st.flagged, FALSE)
        OR COALESCE(mr.flagged, FALSE) THEN 'medium'
      ELSE 'low'
    END::risk_level,

    -- Flags array: lagging + trend
    ARRAY_REMOVE(ARRAY[
      CASE WHEN bs.attendance_rate < 75              THEN 'attendance_critical'     END,
      CASE WHEN bs.avg_score        < 50              THEN 'score_critical'          END,
      CASE WHEN bs.attendance_rate BETWEEN 75 AND 84.99 THEN 'attendance_warning'   END,
      CASE WHEN bs.avg_score       BETWEEN 50 AND 59.99 THEN 'score_warning'        END,
      CASE WHEN COALESCE(ca.flagged, FALSE)           THEN 'consecutive_absences'   END,
      CASE WHEN COALESCE(st.flagged, FALSE)           THEN 'declining_scores'       END,
      CASE WHEN COALESCE(mr.flagged, FALSE)           THEN 'no_recent_mentorship'   END
    ], NULL),

    now()
  FROM base_stats bs
  LEFT JOIN consec_absent      ca ON ca.learner_id = bs.learner_id
  LEFT JOIN score_trend        st ON st.learner_id = bs.learner_id
  LEFT JOIN mentorship_recency mr ON mr.learner_id = bs.learner_id
  ON CONFLICT (learner_id) DO UPDATE SET
    attendance_rate = EXCLUDED.attendance_rate,
    avg_score       = EXCLUDED.avg_score,
    risk_level      = EXCLUDED.risk_level,
    risk_flags      = EXCLUDED.risk_flags,
    last_calculated = EXCLUDED.last_calculated;
END;
$$;
