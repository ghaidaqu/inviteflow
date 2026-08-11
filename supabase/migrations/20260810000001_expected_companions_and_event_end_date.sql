-- Two additive, backwards-compatible columns requested by the organizer:
--
-- 1. guests.expected_companions — how many people the organizer expects
--    this invitation to cover when THEY add the guest manually (e.g. "family
--    of 4"), before the guest has responded at all. Deliberately a separate
--    column from rsvp_responses.companions_count, which is the guest's own
--    stated number once they actually respond — conflating the two would
--    silently overwrite a real RSVP answer with the organizer's guess.
--
-- 2. events.event_end_date — events can span more than one calendar day
--    (a two-day conference, a multi-day retreat). event_date stays the
--    single "starts at" timestamp already used everywhere; this is opt-in
--    and only shown/used when set.

alter table public.events
  add column if not exists event_end_date timestamptz;

alter table public.events
  add constraint events_end_after_start
  check (event_end_date is null or event_date is null or event_end_date > event_date);

alter table public.guests
  add column if not exists expected_companions int not null default 0
  check (expected_companions >= 0);
