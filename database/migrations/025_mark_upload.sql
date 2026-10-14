-- 025_mark_upload.sql
-- Excel mark upload: one mark per learner per label, remembered column
-- mappings and name aliases, and an all-or-nothing import function with a
-- dry-run mode.

-- ── One mark per learner per label ───────────────────────────────────────────
-- Labels live in assessments.notes (e.g. "School Maths — Term 1 (Grade 10 (2025))").
-- NULL notes stay unrestricted (NULLs are distinct in a unique index).
create unique index if not exists assessments_learner_notes_uq
  on public.assessments (learner_id, notes);

-- Teachers may correct marks, not only add them
drop policy if exists assess_inst_u on public.assessments;
create policy assess_inst_u on public.assessments
  for update to authenticated
  using (current_user_role() = 'instructor')
  with check (current_user_role() = 'instructor');

-- ── Remembered column mappings ───────────────────────────────────────────────
-- header_key is the normalised spreadsheet heading. The year is not stored:
-- it depends on which cohort is being uploaded.
create table if not exists public.mark_column_mappings (
  header_key  text primary key,
  kind        text not null check (kind in ('term','baseline','application','june_assignment','ignore')),
  source      text check (source in ('Melisizwe','School')),
  subject     text check (subject in ('Maths','Science')),
  term        smallint check (term between 1 and 4),
  grade       smallint check (grade between 7 and 12),
  updated_by  uuid references public.users(user_id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ── Remembered name aliases ──────────────────────────────────────────────────
create table if not exists public.learner_name_aliases (
  alias_key   text primary key,
  learner_id  uuid not null references public.learners(learner_id) on delete cascade,
  created_by  uuid references public.users(user_id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.mark_column_mappings enable row level security;
alter table public.learner_name_aliases enable row level security;

drop policy if exists mcm_staff_r on public.mark_column_mappings;
create policy mcm_staff_r on public.mark_column_mappings
  for select to authenticated using (current_user_role() in ('admin','instructor'));
drop policy if exists mcm_service on public.mark_column_mappings;
create policy mcm_service on public.mark_column_mappings
  for all to service_role using (true) with check (true);

drop policy if exists lna_staff_r on public.learner_name_aliases;
create policy lna_staff_r on public.learner_name_aliases
  for select to authenticated using (current_user_role() in ('admin','instructor'));
drop policy if exists lna_service on public.learner_name_aliases;
create policy lna_service on public.learner_name_aliases
  for all to service_role using (true) with check (true);

-- ── Import function ──────────────────────────────────────────────────────────
-- p_rows: [{learner_id, notes, score, subject, assessment_type, term, assessment_date}]
-- Inserts new marks, updates changed ones, skips unchanged ones, logs the job
-- and every changed mark. With p_dry_run the whole thing runs and is then
-- rolled back, so the returned counts show exactly what a real run would do.
create or replace function public.apply_mark_import(
  p_program_id  uuid,
  p_rows        jsonb,
  p_actor       uuid,
  p_source_name text,
  p_dry_run     boolean default true
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new   int := 0;
  v_upd   int := 0;
  v_same  int := 0;
  v_job   uuid;
  v_actor record;
begin
  select email, role::text as role into v_actor from users where user_id = p_actor;

  begin
    create temp table _mark_import on commit drop as
    select distinct on (x.learner_id, x.notes)
           x.learner_id, x.notes, x.score, x.subject, x.assessment_type, x.term, x.assessment_date,
           a.assessment_id, a.score as old_score
    from jsonb_to_recordset(p_rows) as x(
           learner_id uuid, notes text, score numeric, subject text,
           assessment_type text, term smallint, assessment_date date)
    left join assessments a on a.learner_id = x.learner_id and a.notes = x.notes
    order by x.learner_id, x.notes;

    select count(*) filter (where assessment_id is null),
           count(*) filter (where assessment_id is not null and old_score is distinct from score),
           count(*) filter (where assessment_id is not null and old_score = score)
      into v_new, v_upd, v_same
    from _mark_import;

    insert into audit_log (actor_id, actor_email, actor_role, action, entity_type, entity_id, entity_label, changes)
    select p_actor, v_actor.email, v_actor.role, 'assessment.update', 'assessment', assessment_id::text, notes,
           jsonb_build_object('before', jsonb_build_object('score', old_score),
                              'after',  jsonb_build_object('score', score),
                              'source', p_source_name)
    from _mark_import
    where assessment_id is not null and old_score is distinct from score;

    insert into assessments (learner_id, program_id, subject, score, max_score, assessment_date,
                             assessment_type, difficulty, term, notes, captured_by)
    select learner_id, p_program_id, subject, score, 100, assessment_date,
           assessment_type, 'medium', term, notes, p_actor
    from _mark_import
    where assessment_id is null or old_score is distinct from score
    on conflict (learner_id, notes) do update
      set score = excluded.score, captured_by = excluded.captured_by;

    insert into import_jobs (created_by, source_name, source_type, program_id, rows_total,
                             rows_imported, rows_skipped, status, completed_at)
    values (p_actor, p_source_name, 'excel', p_program_id, v_new + v_upd + v_same,
            v_new + v_upd, v_same, 'complete', now())
    returning job_id into v_job;

    perform calculate_risk_scores();

    if p_dry_run then
      raise exception '__mark_import_dry_run__';
    end if;
  exception when raise_exception then
    if sqlerrm <> '__mark_import_dry_run__' then raise; end if;
    v_job := null;  -- rolled back
  end;

  return jsonb_build_object('new', v_new, 'updated', v_upd, 'unchanged', v_same,
                            'dry_run', p_dry_run, 'job_id', v_job);
end;
$$;

revoke all on function public.apply_mark_import(uuid, jsonb, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.apply_mark_import(uuid, jsonb, uuid, text, boolean) to service_role;
