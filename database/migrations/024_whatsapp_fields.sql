-- Migration 024: WhatsApp opt-in fields on learner_profiles
-- whatsapp_number: E.164 format, e.g. +27821234567 (no 'whatsapp:' prefix — added at send time)
-- whatsapp_opted_in: explicit consent flag; messages only sent when true

ALTER TABLE learner_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number   TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN NOT NULL DEFAULT false;
