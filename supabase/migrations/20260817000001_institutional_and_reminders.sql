-- 1. Finish applying the previous migration's event_end_date column.
--    (Only guests.expected_companions from that file was ever run against
--    the live database — this column and its constraint were not. Both are
--    additive/backwards-compatible, safe to run now alongside the rest of
--    this file.)
alter table public.events
  add column if not exists event_end_date timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_end_after_start'
  ) then
    alter table public.events
      add constraint events_end_after_start
      check (event_end_date is null or event_date is null or event_end_date > event_date);
  end if;
end $$;

-- 2. Institutional invitations — a third creation variant for
--    organizations/companies, distinct from a personal Digital Invitation:
--    it needs the org's display name and logo up front, before anything
--    else. Both nullable and unused by the other two tracks.
--
--    Note: the logo is stored for on-page branding (header, event card)
--    only. It does NOT become the sender's WhatsApp display picture — that
--    is tied to one Meta Business phone number per WhatsApp Business
--    Account and cannot be swapped per-message or per-organization through
--    the Cloud API. Giving each institutional customer their own branded
--    sender identity would require provisioning a separate WhatsApp
--    Business number per organization, which is an operational/billing
--    decision, not something this migration or the app code can solve.
alter table public.events
  add column if not exists organization_name text,
  add column if not exists organization_logo_url text;

-- 3. Scheduled reminders — one row per (event, kind). Populated by the app
--    (upsertEventReminders in lib/services/reminders.service.ts) whenever
--    an event's event_date is set/changed, and consumed by a cron-invoked
--    endpoint (app/api/cron/reminders/route.ts) that sends the actual
--    WhatsApp message and flips status to 'sent'. The organizer can flip a
--    still-'scheduled' row to 'canceled' from the dashboard at any time
--    before it's due.
create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null check (kind in ('day_before', 'day_after')),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'canceled')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, kind)
);

create index event_reminders_due_idx
  on public.event_reminders (scheduled_at)
  where status = 'scheduled';

create trigger set_event_reminders_updated_at
  before update on public.event_reminders
  for each row execute function public.set_updated_at();

alter table public.event_reminders enable row level security;

-- Organizers manage (view/cancel) their own events' reminders. There is no
-- public/anon policy — reminders are dashboard-only, never guest-facing
-- data — and no client-side insert path either: rows are only ever created
-- by the app's server-side upsert (using the authenticated user's own
-- session, which is still subject to this same policy since it inserts on
-- the organizer's behalf, not through a service-role bypass).
create policy "event_reminders_manage_members" on public.event_reminders
  for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));
