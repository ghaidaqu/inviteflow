-- Enables Supabase Realtime change notifications for the check-in screen,
-- so ticket status updates (from any staff device) reflect live without a
-- page refresh. Guarded because the `supabase_realtime` publication is a
-- Supabase-platform object that doesn't exist on a bare Postgres instance
-- (e.g. the pglite harness used by tests/db) — this is a safe no-op there.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tickets'
    )
  then
    execute 'alter publication supabase_realtime add table public.tickets';
  end if;
end $$;
