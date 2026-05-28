-- ═══════════════════════════════════════════════════════════════════════════
-- Girls in STEM  —  Seed Data (Demo)
-- Run AFTER schema migrations in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTE: For users, create accounts via Supabase Auth UI first, then run:
-- INSERT INTO users (user_id, email, full_name, role, school_id)
-- VALUES ('<auth-uid>', 'admin@girlsstem.org', 'Admin User', 'admin', NULL);

-- ── Schools ──────────────────────────────────────────────────────────────────
INSERT INTO schools (school_id, school_name, district, province, contact_person, contact_email) VALUES
  ('sch-001', 'Naledi High School',      'Soweto',      'Gauteng',       'Ms. T. Dlamini',  't.dlamini@naledi.edu.za'),
  ('sch-002', 'Langa Girls'' Academy',    'Langa',       'Western Cape',  'Mr. K. Adams',    'k.adams@langa.edu.za'),
  ('sch-003', 'Pretoria Tech High',       'Tshwane',     'Gauteng',       'Ms. N. Mokoena',  'n.mokoena@pretoriatech.edu.za'),
  ('sch-004', 'uMlazi Secondary',         'uMlazi',      'KwaZulu-Natal', 'Mr. S. Zulu',     's.zulu@umlazi.edu.za'),
  ('sch-005', 'Galeshewe STEM School',    'Sol Plaatje', 'Northern Cape', 'Ms. P. Motsepe',  'p.motsepe@galeshewe.edu.za')
ON CONFLICT DO NOTHING;

-- ── Programs (instructor_id to be replaced with real UUIDs after user creation) ──
-- Run this after creating instructor users in Supabase Auth
/*
INSERT INTO programs (program_id, program_name, program_type, start_date, end_date, school_id, max_capacity) VALUES
  ('prg-001', 'Code Like a Girl',       'Coding',       '2025-02-03', '2025-06-27', 'sch-001', 30),
  ('prg-002', 'Robotics Explorers',     'Robotics',     '2025-02-03', '2025-06-27', 'sch-002', 25),
  ('prg-003', 'Data Science Basics',    'Data Science', '2025-02-03', '2025-05-30', 'sch-003', 20),
  ('prg-004', 'App Design Studio',      'Design/Tech',  '2025-03-03', '2025-07-25', 'sch-004', 20),
  ('prg-005', 'Maths & Logic Bootcamp', 'Mathematics',  '2025-01-20', '2025-04-25', 'sch-005', 30);
*/

-- ── Quick start guide printed as a comment ────────────────────────────────────
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Create admin user: admin@girlsstem.org (any password)
-- 3. Run: INSERT INTO users (user_id, email, full_name, role)
--         VALUES ('<uid-from-auth>', 'admin@girlsstem.org', 'Platform Admin', 'admin');
-- 4. Create instructor user: instructor@girlsstem.org
-- 5. Run: INSERT INTO users (user_id, email, full_name, role, school_id)
--         VALUES ('<uid-from-auth>', 'instructor@girlsstem.org', 'Thandi Dlamini', 'instructor', 'sch-001');
-- 6. Now sign in at http://localhost:3000/login
-- 7. Create programmes via Admin panel
-- 8. Add learners via Learners → Add Learner
-- 9. Mark attendance via Attendance tab
