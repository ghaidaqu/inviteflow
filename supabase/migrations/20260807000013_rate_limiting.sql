-- Rate limiting for public write endpoints (RSVP submission, ticket purchase).
-- Implemented entirely in Postgres so it needs no third-party service/account.
--
-- Design: every "hit" is one row keyed by an arbitrary string (e.g.
-- `rsvp:<ip>` or `tickets:<ip>`). `check_rate_limit` atomically counts hits
-- for that key within a trailing window and records a new hit if the caller
-- is still under the limit. The table itself is not directly readable or
-- writable by anon/authenticated — only through this SECURITY DEFINER
-- function — matching this project's existing "RPC is the only write path
-- for public traffic" pattern.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_key_created_at_idx
  on public.rate_limit_hits (key, created_at desc);

alter table public.rate_limit_hits enable row level security;

-- Deny all direct client access; the SECURITY DEFINER function below is the
-- only sanctioned way to read or write this table.
create policy "rate_limit_hits_deny_all" on public.rate_limit_hits
  for all to anon, authenticated
  using (false)
  with check (false);

create or replace function public.check_rate_limit(
  p_key text,
  p_max_hits int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Opportunistically prune old hits for this key so the table doesn't grow
  -- unbounded under sustained traffic.
  delete from public.rate_limit_hits
  where key = p_key
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from public.rate_limit_hits
  where key = p_key
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max_hits then
    return false;
  end if;

  insert into public.rate_limit_hits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
