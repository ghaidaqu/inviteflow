-- Removes 'maybe' as an RSVP status everywhere, not just as a default
-- (see 20260818000002, which only changed the default) — a real
-- invitation asks for a clear accept or decline. Also extends
-- respond_via_whatsapp's return with the guest's secure_token, needed to
-- send them their entry QR right after a WhatsApp button-tap acceptance
-- (see lib/whatsapp/notify.ts's sendGuestQrWhatsApp and the webhook route)
-- without an extra round-trip the caller would otherwise need.

-- 1. Existing 'maybe' responses have to become something else before the
--    status constraint below can reject the value outright — 'not_attending'
--    rather than 'attending', since a guest who was never a firm yes
--    shouldn't silently count as one.
update public.rsvp_responses
  set status = 'not_attending'
  where status = 'maybe';

-- 2. Tighten the status check now that no row can violate it. The
--    constraint was originally unnamed (see 20260807000005_guests_and_rsvp.sql),
--    which Postgres names `<table>_<column>_check` by default.
alter table public.rsvp_responses
  drop constraint if exists rsvp_responses_status_check;

alter table public.rsvp_responses
  add constraint rsvp_responses_status_check
  check (status in ('attending', 'not_attending'));

-- 3. allow_maybe has nothing left to gate — drop it rather than leave a
--    dead column.
alter table public.event_settings
  drop column if exists allow_maybe;

-- 4. submit_rsvp: drop the 'maybe' branch from status validation. Same
--    output columns as before, so create or replace is fine here (unlike
--    the waitlist migration's function-signature changes, which needed an
--    explicit drop first).
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

  if p_status not in ('attending', 'not_attending') then
    raise exception 'invalid rsvp status' using errcode = 'check_violation';
  end if;

  if (p_status = 'attending' and not v_event.allow_attending)
    or (p_status = 'not_attending' and not v_event.allow_not_attending)
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

-- 5. respond_via_whatsapp: drop the 'maybe' branch the same way, and add
--    guest_secure_token to the jsonb return.
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
  select id, event_id, name, secure_token into v_guest
  from public.guests
  where id = p_guest_id and deleted_at is null;

  if v_guest.id is null then
    raise exception 'guest not found' using errcode = 'no_data_found';
  end if;

  select e.id, e.status, e.is_rsvp_enabled, e.rsvp_deadline,
         s.allow_attending, s.allow_not_attending
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

  if p_status not in ('attending', 'not_attending') then
    raise exception 'invalid rsvp status' using errcode = 'check_violation';
  end if;

  if (p_status = 'attending' and not v_event.allow_attending)
    or (p_status = 'not_attending' and not v_event.allow_not_attending)
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
    'guest_secure_token', v_guest.secure_token,
    'previous_status', v_previous_status
  );
end;
$$;

revoke all on function public.respond_via_whatsapp(uuid, text) from public;
