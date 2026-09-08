-- A per-event secret the organizer can hand to whoever is actually
-- working the door — often someone with no account here at all, which is
-- the whole reason the dashboard-only scanner wasn't enough.
--
-- Deliberately its own column rather than reusing the event id: the id
-- appears in dashboard URLs the organizer copies around freely, and this
-- one grants the ability to mark guests as arrived, so it needs to be
-- separately secret and separately revocable (regenerate to invalidate an
-- old link — a staffer who no longer works the door loses access).
--
-- Not readable by anon through RLS: the public check-in route resolves it
-- server-side with the service role, so the token only ever travels in
-- the URL the organizer chose to share.
alter table public.events
  add column if not exists check_in_token uuid not null default gen_random_uuid();
