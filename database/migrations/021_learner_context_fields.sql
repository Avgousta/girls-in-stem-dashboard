-- Migration 021: learner context fields
-- Adds socioeconomic/logistical context to learner_profiles for richer risk segmentation
-- and more meaningful sponsor reporting.

ALTER TABLE learner_profiles
  ADD COLUMN IF NOT EXISTS internet_access   BOOLEAN,
  ADD COLUMN IF NOT EXISTS household_size    SMALLINT CHECK (household_size > 0 AND household_size <= 20),
  ADD COLUMN IF NOT EXISTS primary_language  TEXT,
  ADD COLUMN IF NOT EXISTS transport_type    TEXT CHECK (transport_type IN ('walk','taxi','bus','car','other')),
  ADD COLUMN IF NOT EXISTS first_gen_student BOOLEAN;
