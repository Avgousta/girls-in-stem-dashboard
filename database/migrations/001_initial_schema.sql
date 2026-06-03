-- ═══════════════════════════════════════════════════════════════════════════
-- Girls in STEM Intelligence Platform  —  Database Schema v1.0
-- Run on Supabase SQL Editor or via: npx supabase db push
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ── Custom ENUM types ────────────────────────────────────────────────────────
CREATE TYPE user_role           AS ENUM ('admin', 'instructor', 'learner', 'parent');
CREATE TYPE learner_status      AS ENUM ('active', 'inactive', 'graduated', 'withdrawn');
CREATE TYPE attendance_status   AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE project_status      AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE intervention_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE risk_level          AS ENUM ('low', 'medium', 'high');
CREATE TYPE enrollment_status   AS ENUM ('active', 'completed', 'dropped');

-- ── schools ──────────────────────────────────────────────────────────────────
CREATE TABLE schools (
  school_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name    TEXT NOT NULL,
  district       TEXT NOT NULL,
  province       TEXT NOT NULL,
  contact_person TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── users (mirrors Supabase Auth) ────────────────────────────────────────────
CREATE TABLE users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  full_name  TEXT NOT NULL,
  role       user_role NOT NULL DEFAULT 'instructor',
  school_id  UUID REFERENCES schools(school_id) ON DELETE SET NULL,
  phone      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── learners ─────────────────────────────────────────────────────────────────
CREATE TABLE learners (
  learner_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(user_id) ON DELETE SET NULL,
  school_id         UUID NOT NULL REFERENCES schools(school_id) ON DELETE RESTRICT,
  grade             SMALLINT NOT NULL CHECK (grade BETWEEN 8 AND 12),
  parent_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  enrollment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  programme_status  learner_status NOT NULL DEFAULT 'active',
  learner_code      TEXT UNIQUE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learners_school    ON learners(school_id);
CREATE INDEX idx_learners_status    ON learners(programme_status);

-- ── learner_profiles (extended info linked 1:1) ───────────────────────────────
CREATE TABLE learner_profiles (
  learner_id    UUID PRIMARY KEY REFERENCES learners(learner_id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  parent_name   TEXT,
  parent_contact TEXT,
  date_of_birth DATE,
  avatar_url    TEXT
);

-- ── programs ─────────────────────────────────────────────────────────────────
CREATE TABLE programs (
  program_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name  TEXT NOT NULL,
  program_type  TEXT NOT NULL,  -- Coding | Robotics | Data Science | Design | Mathematics
  start_date    DATE NOT NULL,
  end_date      DATE,
  instructor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  school_id     UUID REFERENCES schools(school_id) ON DELETE SET NULL,
  max_capacity  SMALLINT NOT NULL DEFAULT 30,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_programs_school      ON programs(school_id);
CREATE INDEX idx_programs_instructor  ON programs(instructor_id);
CREATE INDEX idx_programs_active      ON programs(is_active) WHERE is_active = true;

-- ── program_enrollments ───────────────────────────────────────────────────────
CREATE TABLE program_enrollments (
  enrollment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          enrollment_status NOT NULL DEFAULT 'active',
  completion_date DATE,
  UNIQUE (learner_id, program_id)
);
CREATE INDEX idx_enrollments_learner ON program_enrollments(learner_id);
CREATE INDEX idx_enrollments_program ON program_enrollments(program_id);

-- ── attendance ────────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id    UUID NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  program_id    UUID NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
  session_date  DATE NOT NULL,
  status        attendance_status NOT NULL DEFAULT 'present',
  captured_by   UUID REFERENCES users(user_id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (learner_id, program_id, session_date)
);
CREATE INDEX idx_attendance_learner      ON attendance(learner_id);
CREATE INDEX idx_attendance_program      ON attendance(program_id);
CREATE INDEX idx_attendance_date         ON attendance(session_date);
CREATE INDEX idx_attendance_date_program ON attendance(program_id, session_date);

-- ── assessments ──────────────────────────────────────────────────────────────
CREATE TABLE assessments (
  assessment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  score           NUMERIC(6,2) NOT NULL CHECK (score >= 0),
  max_score       NUMERIC(6,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  percentage      NUMERIC(5,2) GENERATED ALWAYS AS (ROUND(score / max_score * 100, 2)) STORED,
  grade_band      TEXT,  -- computed by trigger
  assessment_date DATE NOT NULL,
  captured_by     UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessments_learner ON assessments(learner_id);
CREATE INDEX idx_assessments_program ON assessments(program_id);
CREATE INDEX idx_assessments_date    ON assessments(assessment_date);

-- Grade band trigger
CREATE OR REPLACE FUNCTION set_grade_band()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.grade_band := CASE
    WHEN NEW.percentage >= 80 THEN 'Distinction'
    WHEN NEW.percentage >= 70 THEN 'Merit'
    WHEN NEW.percentage >= 60 THEN 'Pass'
    ELSE 'Needs Support'
  END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_grade_band
  BEFORE INSERT OR UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION set_grade_band();

-- ── projects ─────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  project_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id        UUID NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  program_id        UUID REFERENCES programs(program_id) ON DELETE SET NULL,
  project_name      TEXT NOT NULL,
  description       TEXT,
  completion_status project_status NOT NULL DEFAULT 'not_started',
  score             NUMERIC(6,2) CHECK (score >= 0),
  max_score         NUMERIC(6,2) NOT NULL DEFAULT 100,
  submitted_at      TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── mentorship_sessions ───────────────────────────────────────────────────────
CREATE TABLE mentorship_sessions (
  session_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id       UUID NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  mentor_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_date     DATE NOT NULL,
  duration_minutes SMALLINT,
  notes            TEXT,
  next_steps       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentorship_learner ON mentorship_sessions(learner_id);
CREATE INDEX idx_mentorship_mentor  ON mentorship_sessions(mentor_id);

-- ── interventions ─────────────────────────────────────────────────────────────
CREATE TABLE interventions (
  intervention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  flagged_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  action_taken    TEXT,
  follow_up_date  DATE,
  status          intervention_status NOT NULL DEFAULT 'open',
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interventions_learner ON interventions(learner_id);
CREATE INDEX idx_interventions_status  ON interventions(status) WHERE status != 'resolved';

-- ── risk_scores (maintained by scheduled function) ────────────────────────────
CREATE TABLE risk_scores (
  score_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id       UUID UNIQUE NOT NULL REFERENCES learners(learner_id) ON DELETE CASCADE,
  attendance_rate  NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
  risk_level       risk_level NOT NULL DEFAULT 'low',
  risk_flags       TEXT[] NOT NULL DEFAULT '{}',
  last_calculated  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_risk_level ON risk_scores(risk_level);

-- ── Risk scoring function ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_risk_scores()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO risk_scores (learner_id, attendance_rate, avg_score, risk_level, risk_flags, last_calculated)
  SELECT
    l.learner_id,
    COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(a.*), 0), 2), 0) AS attendance_rate,
    COALESCE(ROUND(AVG(asmt.percentage), 2), 0) AS avg_score,
    CASE
      WHEN COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(a.*), 0), 2), 0) < 75
        OR COALESCE(ROUND(AVG(asmt.percentage), 2), 0) < 50 THEN 'high'
      WHEN COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(a.*), 0), 2), 0) < 85
        OR COALESCE(ROUND(AVG(asmt.percentage), 2), 0) < 60 THEN 'medium'
      ELSE 'low'
    END::risk_level AS risk_level,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(a.*), 0), 2), 0) < 75
        THEN 'attendance_critical' END,
      CASE WHEN COALESCE(ROUND(AVG(asmt.percentage), 2), 0) < 50
        THEN 'score_critical' END,
      CASE WHEN COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(a.*), 0), 2), 0) BETWEEN 75 AND 84.99
        THEN 'attendance_warning' END,
      CASE WHEN COALESCE(ROUND(AVG(asmt.percentage), 2), 0) BETWEEN 50 AND 59.99
        THEN 'score_warning' END
    ], NULL) AS risk_flags,
    now() AS last_calculated
  FROM learners l
  LEFT JOIN attendance a ON a.learner_id = l.learner_id
  LEFT JOIN assessments asmt ON asmt.learner_id = l.learner_id
  WHERE l.programme_status = 'active'
  GROUP BY l.learner_id
  ON CONFLICT (learner_id) DO UPDATE SET
    attendance_rate = EXCLUDED.attendance_rate,
    avg_score       = EXCLUDED.avg_score,
    risk_level      = EXCLUDED.risk_level,
    risk_flags      = EXCLUDED.risk_flags,
    last_calculated = EXCLUDED.last_calculated;
END;
$$;

-- Schedule risk recalculation every 6 hours
SELECT cron.schedule('risk-scores', '0 */6 * * *', 'SELECT calculate_risk_scores()');

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE schools               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrollments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores           ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE user_id = auth.uid();
$$;

-- Schools: admins full access, others read
CREATE POLICY schools_admin_all   ON schools FOR ALL  TO authenticated USING (current_user_role() = 'admin');
CREATE POLICY schools_read        ON schools FOR SELECT TO authenticated USING (true);

-- Learners: admins/instructors read all, learners/parents read own
CREATE POLICY learners_admin_all  ON learners FOR ALL    TO authenticated USING (current_user_role() = 'admin');
CREATE POLICY learners_instructor ON learners FOR SELECT TO authenticated USING (current_user_role() = 'instructor');
CREATE POLICY learners_own        ON learners FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY learners_parent     ON learners FOR SELECT TO authenticated USING (parent_id = auth.uid());

-- Attendance: instructors write, others read scoped
CREATE POLICY attendance_admin    ON attendance FOR ALL    TO authenticated USING (current_user_role() = 'admin');
CREATE POLICY attendance_inst_r   ON attendance FOR SELECT TO authenticated USING (current_user_role() = 'instructor');
CREATE POLICY attendance_inst_w   ON attendance FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'instructor');
CREATE POLICY attendance_learner  ON attendance FOR SELECT TO authenticated USING (learner_id = (SELECT learner_id FROM learners WHERE user_id = auth.uid()));

-- Assessments: instructors write, others scoped read
CREATE POLICY assess_admin        ON assessments FOR ALL    TO authenticated USING (current_user_role() = 'admin');
CREATE POLICY assess_inst_r       ON assessments FOR SELECT TO authenticated USING (current_user_role() = 'instructor');
CREATE POLICY assess_inst_w       ON assessments FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'instructor');
CREATE POLICY assess_learner      ON assessments FOR SELECT TO authenticated USING (learner_id = (SELECT learner_id FROM learners WHERE user_id = auth.uid()));

-- Interventions: admin + instructor only
CREATE POLICY interv_admin        ON interventions FOR ALL    TO authenticated USING (current_user_role() = 'admin');
CREATE POLICY interv_instructor   ON interventions FOR ALL    TO authenticated USING (current_user_role() = 'instructor');

-- Risk scores: admin + instructor read
CREATE POLICY risk_admin          ON risk_scores FOR ALL    TO authenticated USING (current_user_role() = 'admin');
CREATE POLICY risk_instructor     ON risk_scores FOR SELECT TO authenticated USING (current_user_role() = 'instructor');
CREATE POLICY risk_learner        ON risk_scores FOR SELECT TO authenticated USING (learner_id = (SELECT learner_id FROM learners WHERE user_id = auth.uid()));
