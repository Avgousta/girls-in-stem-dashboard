-- ═══════════════════════════════════════════════════════════════════════════
-- Girls in STEM  —  Analytics RPC Functions
-- Run after initial schema migration
-- ═══════════════════════════════════════════════════════════════════════════

-- ── get_dashboard_stats ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_learners',        (SELECT COUNT(*) FROM learners WHERE programme_status = 'active'),
    'active_programs',       (SELECT COUNT(*) FROM programs WHERE is_active = true),
    'avg_attendance_rate',   COALESCE((
      SELECT ROUND(100.0 * SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0), 1)
      FROM attendance
    ), 0),
    'avg_score',             COALESCE((SELECT ROUND(AVG(percentage), 1) FROM assessments), 0),
    'high_risk_learners',    (SELECT COUNT(*) FROM risk_scores WHERE risk_level = 'high'),
    'schools_participating', (SELECT COUNT(DISTINCT school_id) FROM learners WHERE programme_status = 'active'),
    'open_interventions',    (SELECT COUNT(*) FROM interventions WHERE status != 'resolved'),
    'completions_this_month',(
      SELECT COUNT(*) FROM program_enrollments
      WHERE status = 'completed'
      AND completion_date >= DATE_TRUNC('month', CURRENT_DATE)
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- ── get_attendance_trend ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_attendance_trend()
RETURNS TABLE(week TEXT, rate NUMERIC, present BIGINT, absent BIGINT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH weekly AS (
    SELECT
      DATE_TRUNC('week', session_date)::DATE AS week_start,
      COUNT(*) FILTER (WHERE status = 'present') AS present_count,
      COUNT(*) FILTER (WHERE status != 'present') AS absent_count,
      COUNT(*) AS total_count
    FROM attendance
    WHERE session_date >= CURRENT_DATE - INTERVAL '84 days'
    GROUP BY 1
    ORDER BY 1
  )
  SELECT
    TO_CHAR(week_start, 'DD Mon') AS week,
    ROUND(100.0 * present_count / NULLIF(total_count, 0), 1) AS rate,
    present_count AS present,
    absent_count  AS absent
  FROM weekly;
END;
$$;

-- ── get_score_distribution ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_score_distribution()
RETURNS TABLE(grade_band TEXT, count BIGINT, percentage NUMERIC) LANGUAGE plpgsql AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM assessments;

  RETURN QUERY
  SELECT
    a.grade_band,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / NULLIF(total_count, 0), 1) AS percentage
  FROM assessments a
  WHERE a.grade_band IS NOT NULL
  GROUP BY a.grade_band
  ORDER BY CASE a.grade_band
    WHEN 'Distinction'    THEN 1
    WHEN 'Merit'          THEN 2
    WHEN 'Pass'           THEN 3
    WHEN 'Needs Support'  THEN 4
  END;
END;
$$;

-- ── get_school_comparison ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_school_comparison()
RETURNS TABLE(school_name TEXT, learner_count BIGINT, avg_attendance NUMERIC, avg_score NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.school_name,
    COUNT(DISTINCT l.learner_id) AS learner_count,
    COALESCE(ROUND(100.0 * SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(att.*), 0), 1), 0) AS avg_attendance,
    COALESCE(ROUND(AVG(asmt.percentage), 1), 0) AS avg_score
  FROM schools s
  LEFT JOIN learners l ON l.school_id = s.school_id AND l.programme_status = 'active'
  LEFT JOIN attendance att ON att.learner_id = l.learner_id
  LEFT JOIN assessments asmt ON asmt.learner_id = l.learner_id
  WHERE s.is_active = true
  GROUP BY s.school_id, s.school_name
  ORDER BY avg_attendance DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats()       TO authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_trend()      TO authenticated;
GRANT EXECUTE ON FUNCTION get_score_distribution()    TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_comparison()     TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_risk_scores()     TO authenticated;
