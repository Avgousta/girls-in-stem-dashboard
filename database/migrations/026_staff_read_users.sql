-- 026_staff_read_users.sql
-- users RLS only allowed a person to read their own row, so every staff page
-- that lists or joins other users (assignee pickers, "mentor", "captured by",
-- dashboards, approvals) silently got nothing back.
--
-- Active admins and instructors may now read all user rows. Learners, parents
-- and sponsors still only see their own row.
--
-- is_staff() is SECURITY DEFINER so it can read users without re-entering this
-- table's RLS (a plain policy calling current_user_role() would recurse).

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where user_id = auth.uid() and role in ('admin', 'instructor') and is_active
  );
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

drop policy if exists users_staff_read on public.users;
create policy users_staff_read on public.users
  for select to authenticated
  using (public.is_staff());
