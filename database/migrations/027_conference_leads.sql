-- 027_conference_leads.sql
-- Lead register for the conference QR code (/connect landing page).
-- Public visitors never touch this table directly: the /api/v1/connect route
-- validates the form and inserts with the service role. Only active admins can
-- read, update or delete leads (the register holds personal information).

create table if not exists public.conference_leads (
  lead_id           uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- Visitor details
  full_name         text not null check (char_length(full_name) between 2 and 120),
  email             text not null check (char_length(email) <= 200),
  organisation      text,
  job_title         text,
  country           text not null,

  -- Engagement
  interests         text[] not null check (cardinality(interests) >= 1),
  context_answer    text,
  message           text,
  next_step         text not null check (next_step in ('meeting','information','pilot','partnership','keep_in_touch')),
  marketing_opt_in  boolean not null default false,
  privacy_ack_at    timestamptz not null default now(),
  source            text not null default 'SSOW Amsterdam 2026',

  -- Internal workflow
  lead_category     text not null check (lead_category in ('MCX','Academy','NPO','Multiple')),
  priority          text not null default 'Medium' check (priority in ('High','Medium','Low')),
  owner             text,
  follow_up_date    date,
  status            text not null default 'New'
                    check (status in ('New','Contacted','Meeting booked','Proposal sent','Won','Closed')),
  internal_notes    text,
  updated_at        timestamptz not null default now()
);

create index if not exists conference_leads_created_idx on public.conference_leads (created_at desc);
create index if not exists conference_leads_status_idx  on public.conference_leads (status);

create or replace function public.touch_conference_lead()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists conference_leads_touch on public.conference_leads;
create trigger conference_leads_touch
  before update on public.conference_leads
  for each row execute function public.touch_conference_lead();

-- Admin check that does not re-enter users RLS
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where user_id = auth.uid() and role = 'admin' and is_active
  );
$$;

revoke all on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;

alter table public.conference_leads enable row level security;

drop policy if exists conference_leads_admin_read   on public.conference_leads;
drop policy if exists conference_leads_admin_update on public.conference_leads;
drop policy if exists conference_leads_admin_delete on public.conference_leads;

create policy conference_leads_admin_read on public.conference_leads
  for select to authenticated using (public.is_active_admin());

create policy conference_leads_admin_update on public.conference_leads
  for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy conference_leads_admin_delete on public.conference_leads
  for delete to authenticated using (public.is_active_admin());

-- No insert policy: inserts happen only through the service role.
revoke all on public.conference_leads from anon;
