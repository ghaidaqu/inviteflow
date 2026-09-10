-- Two secrets were sitting in a table the public can read.
--
-- `events` has an RLS policy that lets anyone read a published, public
-- event — it has to, or a guest couldn't open an invitation link. RLS is
-- row-level, not column-level, so `select=*` with the anon key returned
-- the whole row, including:
--
--   * check_in_token — the door-staff secret. Its entire purpose was to
--     be something other than the event id, because it grants opening
--     the scanner and marking guests arrived. Anyone could read it for
--     any public event and work the door.
--   * password_hash — the bcrypt hash behind a password-protected event.
--
-- Verified against production with the anon key before this migration:
-- `/rest/v1/events?select=id,check_in_token` returned 200.
--
-- Revoking column privileges was the obvious fix and the wrong one: it
-- breaks every `select('*')` in the app, of which there are nine on this
-- table alone, and a missed column becomes undefined at runtime rather
-- than an error. Moving the secrets out instead leaves every one of those
-- queries working — they simply stop returning what they should never
-- have returned — and puts both values behind a table no client role can
-- read at all.

create table public.event_secrets (
  event_id uuid primary key references public.events (id) on delete cascade,
  password_hash text,
  -- Same default as the column it replaces, so a new event has a working
  -- door link from the moment it exists.
  check_in_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create unique index event_secrets_check_in_token_idx
  on public.event_secrets (check_in_token);

alter table public.event_secrets enable row level security;

-- Deny-all, spelled out rather than left implicit: the server reads and
-- writes this with the service role, which bypasses RLS. An explicit
-- policy makes the intended boundary something an audit can see, the same
-- way institutional_leads does it.
create policy "event_secrets_no_client_access"
  on public.event_secrets for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.event_secrets from anon, authenticated;

insert into public.event_secrets (event_id, password_hash, check_in_token)
select id, password_hash, check_in_token
from public.events
on conflict (event_id) do nothing;

-- Every event needs its row, the same way event_settings and
-- event_designs are created by a trigger rather than by each caller.
create or replace function public.handle_new_event_secrets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_secrets (event_id)
  values (new.id)
  on conflict (event_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_event_created_secrets on public.events;
create trigger on_event_created_secrets
  after insert on public.events
  for each row execute function public.handle_new_event_secrets();

alter table public.events
  drop column if exists password_hash,
  drop column if exists check_in_token;
