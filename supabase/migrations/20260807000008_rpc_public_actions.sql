-- Public-facing RPC functions -----------------------------------------------
-- These SECURITY DEFINER functions are the ONLY way anonymous guests can
-- write RSVP/ticket data or staff can check in a ticket. They validate every
-- business rule internally (event published, deadlines, quantities, token
-- ownership, staff membership) before touching a row, so the underlying
-- tables can stay locked down to organizer-only access via RLS.

-- Submit a new RSVP (no login required). ------------------------------------
create or replace function public.submit_rsvp(
  p_event_slug text,
  p_guest_name text,
  p_phone text,
  p_email text,
  p_status text,
  p_companions_count int,
  p_companions_names jsonb,
  p_message text,
  p_answers jsonb -- jsonb array of {question_id, answer_value}
)
returns table (guest_id uuid, response_id uuid, secure_token uuid)
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

  return query select v_guest_id, v_response_id, v_secure_token;
end;
$$;

grant execute on function public.submit_rsvp(text, text, text, text, text, int, jsonb, text, jsonb)
  to anon, authenticated;

-- Fetch a guest's RSVP by their secure token (for the "edit my response" page).
create or replace function public.get_rsvp_by_token(p_secure_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'guest', jsonb_build_object('id', g.id, 'name', g.name, 'phone', g.phone, 'email', g.email),
    'event', jsonb_build_object('id', e.id, 'slug', e.slug, 'name', e.name, 'rsvp_deadline', e.rsvp_deadline),
    'response', jsonb_build_object(
      'id', r.id,
      'status', r.status,
      'companions_count', r.companions_count,
      'companions_names', r.companions_names,
      'message', r.message,
      'responded_at', r.responded_at
    ),
    'answers', coalesce(
      (
        select jsonb_agg(jsonb_build_object('question_id', a.question_id, 'answer_value', a.answer_value))
        from public.custom_answers a
        where a.response_id = r.id
      ),
      '[]'::jsonb
    )
  )
  from public.guests g
  join public.events e on e.id = g.event_id
  left join public.rsvp_responses r on r.guest_id = g.id
  where g.secure_token = p_secure_token
    and g.deleted_at is null;
$$;

grant execute on function public.get_rsvp_by_token(uuid) to anon, authenticated;

-- Update an existing RSVP via the guest's secure token. ----------------------
create or replace function public.update_rsvp_by_token(
  p_secure_token uuid,
  p_status text,
  p_companions_count int,
  p_companions_names jsonb,
  p_message text,
  p_answers jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest record;
  v_event record;
  v_response_id uuid;
  v_answer jsonb;
begin
  select g.id, g.event_id into v_guest
  from public.guests g
  where g.secure_token = p_secure_token and g.deleted_at is null;

  if v_guest.id is null then
    raise exception 'invalid token' using errcode = 'no_data_found';
  end if;

  select e.id, e.rsvp_deadline, s.allow_guest_edit, s.max_companions
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

  return true;
end;
$$;

grant execute on function public.update_rsvp_by_token(uuid, text, int, jsonb, text, jsonb)
  to anon, authenticated;

-- Purchase tickets via the Mock Payment provider (no login required). -------
-- NOTE: this function represents the "instant confirm" mock flow only. A
-- real provider (Stripe/Moyasar, phase 2 roadmap item) will instead create a
-- 'pending' order first and issue tickets from a webhook once payment is
-- actually confirmed — see lib/payments/provider.ts.
create or replace function public.purchase_tickets_mock(
  p_event_slug text,
  p_ticket_type_id uuid,
  p_quantity int,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_ticket_type record;
  v_order_id uuid;
  v_total numeric(10, 2);
  v_ticket jsonb;
  v_tickets jsonb := '[]'::jsonb;
  i int;
begin
  select id, status, is_ticketing_enabled into v_event
  from public.events
  where slug = p_event_slug and deleted_at is null;

  if v_event.id is null or v_event.status <> 'published' or not v_event.is_ticketing_enabled then
    raise exception 'ticketing is not open for this event' using errcode = 'check_violation';
  end if;

  select id, price, currency, max_per_order, status, sale_start_at, sale_end_at
  into v_ticket_type
  from public.ticket_types
  where id = p_ticket_type_id and event_id = v_event.id and deleted_at is null
  for update;

  if v_ticket_type.id is null then
    raise exception 'ticket type not found' using errcode = 'no_data_found';
  end if;

  if v_ticket_type.status <> 'active' then
    raise exception 'ticket type is not on sale' using errcode = 'check_violation';
  end if;

  if (v_ticket_type.sale_start_at is not null and now() < v_ticket_type.sale_start_at)
    or (v_ticket_type.sale_end_at is not null and now() > v_ticket_type.sale_end_at)
  then
    raise exception 'ticket type is outside its sale window' using errcode = 'check_violation';
  end if;

  if p_quantity < 1 or p_quantity > v_ticket_type.max_per_order then
    raise exception 'invalid quantity requested' using errcode = 'check_violation';
  end if;

  v_total := v_ticket_type.price * p_quantity;

  insert into public.ticket_orders
    (event_id, buyer_name, buyer_email, buyer_phone, total_amount, currency, payment_status, payment_provider)
  values
    (v_event.id, p_buyer_name, p_buyer_email, p_buyer_phone, v_total, v_ticket_type.currency, 'paid', 'mock')
  returning id into v_order_id;

  for i in 1..p_quantity loop
    insert into public.tickets (order_id, ticket_type_id, event_id, holder_name, holder_email, price_paid)
    values (v_order_id, v_ticket_type.id, v_event.id, p_buyer_name, p_buyer_email, v_ticket_type.price)
    returning jsonb_build_object('id', id, 'qr_token', qr_token) into v_ticket;

    v_tickets := v_tickets || jsonb_build_array(v_ticket);
  end loop;

  return jsonb_build_object('order_id', v_order_id, 'total_amount', v_total, 'tickets', v_tickets);
end;
$$;

grant execute on function public.purchase_tickets_mock(text, uuid, int, text, text, text)
  to anon, authenticated;

-- Staff/organizer-only: scan and check in a ticket by its QR token. ---------
create or replace function public.check_in_ticket(p_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = 'insufficient_privilege';
  end if;

  select t.id, t.status, t.holder_name, e.organization_id
  into v_ticket
  from public.tickets t
  join public.events e on e.id = t.event_id
  where t.qr_token = p_qr_token;

  if v_ticket.id is null then
    return jsonb_build_object('result', 'not_found');
  end if;

  if not public.is_org_member(v_ticket.organization_id) then
    raise exception 'not authorized to check in tickets for this event'
      using errcode = 'insufficient_privilege';
  end if;

  if v_ticket.status = 'cancelled' then
    return jsonb_build_object('result', 'cancelled', 'holder_name', v_ticket.holder_name);
  end if;

  if v_ticket.status = 'used' then
    return jsonb_build_object('result', 'already_used', 'holder_name', v_ticket.holder_name);
  end if;

  update public.tickets set status = 'used' where id = v_ticket.id;

  insert into public.ticket_check_ins (ticket_id, checked_in_by)
  values (v_ticket.id, auth.uid());

  return jsonb_build_object('result', 'valid', 'holder_name', v_ticket.holder_name);
end;
$$;

grant execute on function public.check_in_ticket(uuid) to authenticated;
