-- Enables live delivery of new in-app notifications (RSVP/ticket/check-in)
-- to the dashboard notification bell without polling. Same defensive guard
-- as 20260807000011 — a safe no-op on a bare Postgres instance.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    )
  then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;
