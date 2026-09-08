-- Which of the three creation tracks (Digital Invitation / Link
-- Invitation / Institutional) an event started as — never persisted
-- before, so there was no way to tell an existing event's track apart
-- after creation (the events list couldn't show it, and settings that
-- only make sense for one track — like public visibility for Link, or
-- password protection — had no reliable way to know when to apply).
-- Nullable: every event created before this stays unknown rather than
-- guessed at, which the events list shows as such rather than a wrong
-- label.
alter table public.events
  add column if not exists track text check (track in ('invitation', 'rsvp', 'institutional'));
