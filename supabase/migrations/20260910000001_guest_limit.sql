-- Guest limit + a switch for the reserve list.
--
-- The organizer says up front how many people they are inviting — that
-- number is what the invitation is priced on, so it has to be decided
-- before the guest list is typed, not after. From then on the main list
-- can hold that many *live* invitations.
--
-- "Live" is the important part. A guest who declines still occupies a row
-- in the main list, but not a seat, so they stop counting against the
-- limit — which is exactly what makes the reserve list work: one decline
-- frees one place, and the next person on the reserve list takes it. The
-- count stays at the number that was paid for instead of creeping past
-- it every time someone can't come.
--
-- The limit is enforced in application code (lib/actions/guests.ts), not
-- by a trigger here. A trigger would also fire on the promotion path, and
-- a reserve guest being promoted must never be blocked — the decline that
-- freed their place has already happened, and failing there would leave
-- the list one invitation short with nothing to show for it.

alter table public.events
  add column if not exists guest_limit int
  check (guest_limit is null or guest_limit between 1 and 100000);

comment on column public.events.guest_limit is
  'How many live invitations the main guest list may hold. NULL means no limit (link-track events, and every event created before this column existed).';

-- Whether a decline automatically sends the invitation on to the next
-- person on the reserve list. On by default: that has been the behaviour
-- since the reserve list shipped, and an event with no reserve list is
-- unaffected either way. The switch exists so an organizer who wants to
-- decide each replacement themselves can stop the automatic send.
alter table public.event_settings
  add column if not exists auto_replace_declines boolean not null default true;

-- Same function as before, with one addition: it now refuses to promote
-- anyone when the event has the switch off. Enforced here rather than at
-- the call sites because there are three of them (the RSVP form, the
-- guest's own edit-by-token link, and the WhatsApp webhook) and a missed
-- one would send an invitation the organizer had explicitly turned off.
create or replace function public.promote_next_waitlisted_guest(p_event_id uuid)
returns table (guest_id uuid, name text, phone text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest record;
  v_enabled boolean;
begin
  select s.auto_replace_declines into v_enabled
  from public.event_settings s
  where s.event_id = p_event_id;

  -- No settings row at all is treated as enabled, matching the column
  -- default and the behaviour before this switch existed.
  if v_enabled is false then
    return;
  end if;

  select g.id, g.name, g.phone into v_guest
  from public.guests g
  where g.event_id = p_event_id
    and g.is_waitlisted = true
    and g.deleted_at is null
    and g.phone is not null
  order by g.created_at asc
  limit 1
  for update skip locked;

  if v_guest.id is null then
    return;
  end if;

  update public.guests set is_waitlisted = false where id = v_guest.id;

  return query select v_guest.id, v_guest.name, v_guest.phone;
end;
$$;

-- Server-only, same as the rest of the promotion path: revoked from
-- PUBLIC as well, because Postgres grants EXECUTE to PUBLIC by default
-- and revoking from anon/authenticated alone leaves that grant standing.
revoke all on function public.promote_next_waitlisted_guest(uuid)
  from public, anon, authenticated;
