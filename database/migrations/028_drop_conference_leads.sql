-- 028_drop_conference_leads.sql
-- The conference QR flyer moved to its own project (melisizwe-connect) with its
-- own database. Remove the empty table and helpers added by 027.

drop table if exists public.conference_leads;
drop function if exists public.touch_conference_lead();
drop function if exists public.is_active_admin();
