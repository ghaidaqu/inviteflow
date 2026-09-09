-- The duplicate guard compared phone numbers as raw strings.
--
-- submit_rsvp's own callers normalize before calling, so the public path
-- was fine. The organizer path did not: lib/actions/guests.ts used to fall
-- back to storing whatever digits were typed when a number couldn't be
-- parsed. So against a stored '+966511111111', the guard let through
-- '0511111111', '00966511111111' and ' +966511111111 ' — the same person,
-- three more times. Production has three stored numbers that are not E.164
-- and three (event, phone) groups holding the same person more than once.
--
-- This normalizes BOTH sides of the comparison, so the guard catches a
-- number however it was written down. Saudi mobiles are the only local
-- form worth special-casing; anything else is compared on its digits.
create or replace function public.canonical_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when p_phone is null or btrim(p_phone) = '' then null
    -- strip everything that isn't a digit, then fold the four ways a Saudi
    -- mobile gets written into the one E.164 form.
    when regexp_replace(p_phone, '\D', '', 'g') like '00966%'
      then '+' || substring(regexp_replace(p_phone, '\D', '', 'g') from 3)
    when regexp_replace(p_phone, '\D', '', 'g') like '966%'
      then '+' || regexp_replace(p_phone, '\D', '', 'g')
    when regexp_replace(p_phone, '\D', '', 'g') like '05%'
      then '+966' || substring(regexp_replace(p_phone, '\D', '', 'g') from 2)
    when regexp_replace(p_phone, '\D', '', 'g') ~ '^5\d{8}$'
      then '+966' || regexp_replace(p_phone, '\D', '', 'g')
    else '+' || regexp_replace(p_phone, '\D', '', 'g')
  end;
$$;

comment on function public.canonical_phone(text) is
  'Folds the ways a Saudi mobile is written into one E.164 form, so the '
  'duplicate guard in submit_rsvp compares people rather than spellings.';

-- Server-side only: it is a helper for submit_rsvp, not a public surface.
revoke execute on function public.canonical_phone(text) from public, anon, authenticated;

-- Recreate submit_rsvp with the guard comparing canonical forms.
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
    s.max_companions,
    s.require_phone
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

  if v_event.require_phone and (p_phone is null or btrim(p_phone) = '') then
    raise exception 'phone number is required for this event' using errcode = 'check_violation';
  end if;

  if p_phone is not null and btrim(p_phone) <> '' and exists (
    select 1 from public.guests g
    where g.event_id = v_event.id
      and public.canonical_phone(g.phone) = public.canonical_phone(p_phone)
      and g.deleted_at is null
  ) then
    raise exception 'this phone number has already responded to this event'
      using errcode = 'unique_violation';
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

revoke all on function public.submit_rsvp(text, text, text, text, text, int, jsonb, text, jsonb) from public;
grant execute on function public.submit_rsvp(text, text, text, text, text, int, jsonb, text, jsonb)
  to anon, authenticated;
