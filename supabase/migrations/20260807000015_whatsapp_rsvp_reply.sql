-- Lets a guest accept/decline a "digital invitation" entirely inside
-- WhatsApp (tapping an interactive reply button) — no website visit at
-- all. Called only from app/api/webhooks/whatsapp/route.ts via the
-- service-role client after verifying the inbound webhook is genuinely
-- from Meta; never exposed to anon/authenticated.
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

  insert into public.rsvp_responses (event_id, guest_id, status)
  values (v_guest.event_id, v_guest.id, p_status)
  on conflict (event_id, guest_id)
  do update set status = excluded.status, responded_at = now()
  returning id into v_response_id;

  return jsonb_build_object(
    'response_id', v_response_id,
    'guest_name', v_guest.name,
    'event_id', v_guest.event_id
  );
end;
$$;

revoke all on function public.respond_via_whatsapp(uuid, text) from public;
