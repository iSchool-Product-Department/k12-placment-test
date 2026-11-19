-- Run once in Supabase: SQL Editor > New query > paste > Run.
create table if not exists tests (
  id text primary key,
  data jsonb not null,
  status text not null,
  updated_at timestamptz not null default now()
);
alter table tests enable row level security;

-- Only signed-in team members can read results. Students cannot read anything.
drop policy if exists "team reads tests" on tests;
create policy "team reads tests" on tests for select to authenticated using (true);

-- Students save through this function only. A finished test is never overwritten (no retakes).
create or replace function save_test(rec jsonb) returns void
language sql security definer set search_path = public as $$
  insert into tests (id, data, status, updated_at)
  values (rec->>'id', rec, rec->>'status', now())
  on conflict (id) do update set data = excluded.data, status = excluded.status, updated_at = now()
  where tests.status <> 'done';
$$;
revoke all on function save_test(jsonb) from public;
grant execute on function save_test(jsonb) to anon, authenticated;
