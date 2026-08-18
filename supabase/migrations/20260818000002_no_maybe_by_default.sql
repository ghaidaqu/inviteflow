-- A real invitation asks for a clear accept or decline — 'maybe' stays a
-- real, supported response (existing guests who already replied "maybe"
-- are untouched, and organizers can still turn it back on from RSVP
-- settings), it just isn't the sensible starting default for a brand new
-- event anymore. Only changes what NEW event_settings rows get; doesn't
-- touch any existing event.
alter table public.event_settings
  alter column allow_maybe set default false;
