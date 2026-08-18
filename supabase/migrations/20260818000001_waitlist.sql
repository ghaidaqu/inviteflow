-- Waitlist: a reserve pool of guests who aren't sent an invitation up
-- front. Whenever a *main* guest's response transitions into
-- 'not_attending' — for the first time, not on a repeat decline — the
-- oldest still-waitlisted guest with a phone number is automatically
-- promoted (is_waitlisted flips to false) and sent the real invitation.
-- One decline promotes exactly one person; there's no capacity math here,
-- just a 1:1 backfill, matching what was actually asked for.
--
-- The promotion itself happens in application code
-- (lib/services/waitlist.service.ts), since sending a WhatsApp message
-- isn't something a plain plpgsql function can do. What these RPC changes
-- add is everything the app needs to detect "this was a genuine decline,
-- not a repeat" and know which event to promote into, without an extra
-- round-trip query on every RSVP submission.

alter table public.guests
  add column if not exists is_waitlisted boolean not null default false;

create index if not exists guests_waitlist_idx
  on public.guests (event_id, created_at)
  where is_waitlisted = true and deleted_at is null;

-- 1. submit_rsvp now also returns event_id — the public RSVP form only
--    had the event's slug in scope before, not its id, so promoting
--    required an extra lookup. First-time submissions never need a
--    "previous status" check (there's nothing to have declined before).
--    Postgres won't let `create or replace function` change a function's
--    output columns, even just appending one, so the old version has to
--    be dropped first.
drop function if exists public.submit_rsvp(text, text, text, text, text, int, jsonb, text, jsonb);

create or replace function public.submit_rsvp(
  p_event_slug text,
  p_guest_name text,
  p_phone text,
  p_email text,
  p_status text,
  p_companions_count int,
  p_companions_names jsonb,
  p_message text,
  p_answers jsonb
)
returns table (guest_id uuid, response_id uuid, secure_token uuid, event_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_guest_id uuid;
  v_response_id uuid;
  v_secure_token uuid;
  v_answer jsonb;
begin
  select
    e.id,
    e.status,
    e.is_rsvp_enabled,
    e.rsvp_deadline,
    s.allow_attending,
    s.allow_not_attending,
    s.allow_maybe,
    s.max_companions
  into v_event
  from public.events e
  join public.event_settings s on s.event_id = e.id
  where e.slug = p_event_slug and e.deleted_at is null;

  if v_event.id is null then
    raise exception 'event not found' using errcode = 'no_data_found';
  end if;

  if v_event.status <> 'published' or not v_event.is_rsvp_enabled then
    raise exception 'rsvp is not open for this event' using errcode = 'check_violation';
  end if;

  if v_event.rsvp_deadline is not null and now() > v_event.rsvp_deadline then
    raise exception 'rsvp deadline has passed' using errcode = 'check_violation';
  end if;

  if p_status not in ('attending', 'not_attending', 'maybe') then
    raise exception 'invalid rsvp status' using errcode = 'check_violation';
  end if;

  if (p_status = 'attending' and not v_event.allow_attending)
    or (p_status = 'not_attending' and not v_event.allow_not_attending)
    or (p_status = 'maybe' and not v_event.allow_maybe)
  then
    raise exception 'response option % is not allowed for this event', p_status
      using errcode = 'check_violation';
  end if;

  if coalesce(p_companions_count, 0) > v_event.max_companions then
    raise exception 'companions count exceeds the allowed maximum' using errcode = 'check_violation';
  end if;

  insert into public.guests (event_id, name, phone, email)
  values (v_event.id, p_guest_name, p_phone, p_email)
  returning guests.id, guests.secure_token into v_guest_id, v_secure_token;

  insert into public.rsvp_responses (event_id, guest_id, status, companions_count, companions_names, message)
  values (
    v_event.id,
    v_guest_id,
    p_status,
    coalesce(p_companions_count, 0),
    coalesce(p_companions_names, '[]'::jsonb),
    p_message
  )
  returning id into v_response_id;

  if p_answers is not null then
    for v_answer in select * from jsonb_array_elements(p_answers)
    loop
      insert into public.custom_answers (response_id, question_id, answer_value)
      values (v_response_id, (v_answer ->> 'question_id')::uuid, v_answer -> 'answer_value');
    end loop;
  end if;

  return query select v_guest_id, v_response_id, v_secure_token, v_event.id;
end;
$$;

grant execute on function public.submit_rsvp(text, text, text, text, text, int, jsonb, text, jsonb)
  to anon, authenticated;

-- 2. update_rsvp_by_token now returns event_id, event_slug, and the status
--    the guest had *before* this edit, so the app can tell a genuine new
--    decline apart from someone re-submitting the same decline (or
--    flipping back and forth), instead of promoting a waitlisted guest
--    every single time — and can send the promoted guest's invitation
--    without an extra query the caller (running as anon) might not have
--    RLS access to run itself.
drop function if exists public.update_rsvp_by_token(uuid, text, int, jsonb, text, jsonb);

create or replace function public.update_rsvp_by_token(
  p_secure_token uuid,
  p_status text,
  p_companions_count int,
  p_companions_names jsonb,
  p_message text,
  p_answers jsonb
)
returns table (event_id uuid, event_slug text, previous_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest record;
  v_event record;
  v_response_id uuid;
  v_previous_status text;
  v_answer jsonb;
begin
  select g.id, g.event_id into v_guest
  from public.guests g
  where g.secure_token = p_secure_token and g.deleted_at is null;

  if v_guest.id is null then
    raise exception 'invalid token' using errcode = 'no_data_found';
  end if;

  -- Selected via this security-definer function rather than the caller
  -- querying `events` directly afterward: the caller runs as anon, and
  -- `events` SELECT is RLS-restricted to public+published events, which
  -- would silently fail to resolve the slug for a private event.
  select e.id, e.slug, e.rsvp_deadline, s.allow_guest_edit, s.max_companions
  into v_event
  from public.events e
  join public.event_settings s on s.event_id = e.id
  where e.id = v_guest.event_id;

  if not v_event.allow_guest_edit then
    raise exception 'editing responses is disabled for this event' using errcode = 'check_violation';
  end if;

  if v_event.rsvp_deadline is not null and now() > v_event.rsvp_deadline then
    raise exception 'rsvp deadline has passed' using errcode = 'check_violation';
  end if;

  if coalesce(p_companions_count, 0) > v_event.max_companions then
    raise exception 'companions count exceeds the allowed maximum' using errcode = 'check_violation';
  end if;

  select r.status into v_previous_status
  from public.rsvp_responses r
  where r.guest_id = v_guest.id;

  update public.rsvp_responses
  set status = p_status,
      companions_count = coalesce(p_companions_count, 0),
      companions_names = coalesce(p_companions_names, '[]'::jsonb),
      message = p_message
  where guest_id = v_guest.id
  returning id into v_response_id;

  if v_response_id is null then
    raise exception 'no existing rsvp response to update' using errcode = 'no_data_found';
  end if;

  if p_answers is not null then
    delete from public.custom_answers where response_id = v_response_id;

    for v_answer in select * from jsonb_array_elements(p_answers)
    loop
      insert into public.custom_answers (response_id, question_id, answer_value)
      values (v_response_id, (v_answer ->> 'question_id')::uuid, v_answer -> 'answer_value');
    end loop;
  end if;

  return query select v_event.id, v_event.slug, v_previous_status;
end;
$$;

grant execute on function public.update_rsvp_by_token(uuid, text, int, jsonb, text, jsonb)
  to anon, authenticated;

-- 3. respond_via_whatsapp (button taps) similarly now reports the status
--    the guest had before this tap, alongside event_id it already returned.
create or replace function public.respond_via_whatsapp(
  p_guest_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest record;
  v_event record;
  v_response_id uuid;
  v_previous_status text;
begin
  select id, event_id, name into v_guest
  from public.guests
  where id = p_guest_id and deleted_at is null;

  if v_guest.id is null then
    raise exception 'guest not found' using errcode = 'no_data_found';
  end if;

  select e.id, e.status, e.is_rsvp_enabled, e.rsvp_deadline,
         s.allow_attending, s.allow_not_attending, s.allow_maybe
  into v_event
  from public.events e
  join public.event_settings s on s.event_id = e.id
  where e.id = v_guest.event_id;

  if v_event.status <> 'published' or not v_event.is_rsvp_enabled then
    raise exception 'rsvp is not open for this event' using errcode = 'check_violation';
  end if;

  if v_event.rsvp_deadline is not null and now() > v_event.rsvp_deadline then
    raise exception 'rsvp deadline has passed' using errcode = 'check_violation';
  end if;

  if p_status not in ('attending', 'not_attending', 'maybe') then
    raise exception 'invalid rsvp status' using errcode = 'check_violation';
  end if;

  if (p_status = 'attending' and not v_event.allow_attending)
    or (p_status = 'not_attending' and not v_event.allow_not_attending)
    or (p_status = 'maybe' and not v_event.allow_maybe)
  then
    raise exception 'response option % is not allowed for this event', p_status
      using errcode = 'check_violation';
  end if;

  select r.status into v_previous_status
  from public.rsvp_responses r
  where r.guest_id = v_guest.id;

  insert into public.rsvp_responses (event_id, guest_id, status)
  values (v_guest.event_id, v_guest.id, p_status)
  on conflict (event_id, guest_id)
  do update set status = excluded.status, responded_at = now()
  returning id into v_response_id;

  return jsonb_build_object(
    'response_id', v_response_id,
    'guest_name', v_guest.name,
    'event_id', v_guest.event_id,
    'previous_status', v_previous_status
  );
end;
$$;

revoke all on function public.respond_via_whatsapp(uuid, text) from public;

-- 4. The actual promotion. Runs as security definer so it can read/update
--    `guests` regardless of who's calling — the public RSVP form and the
--    guest's own edit-by-token link both run as anon, which has no direct
--    RLS access to another guest's row. Picks the oldest still-waitlisted
--    guest *with a phone number* (no phone means we have no way to invite
--    them, so they're skipped rather than "used up" — the next-oldest one
--    with a phone gets picked instead) and flips them off the waitlist.
--    Sending the actual WhatsApp invitation happens in application code
--    right after this call (see lib/services/waitlist.service.ts) — this
--    function only reserves the guest so two simultaneous declines can't
--    both promote the same person.
create or replace function public.promote_next_waitlisted_guest(p_event_id uuid)
returns table (guest_id uuid, name text, phone text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest record;
begin
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

grant execute on function public.promote_next_waitlisted_guest(uuid) to anon, authenticated;
