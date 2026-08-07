-- Support for a real, async payment provider (Moyasar) alongside the
-- existing synchronous mock flow. A real gateway can't confirm-and-issue in
-- one call like purchase_tickets_mock() does — the browser gets redirected
-- to a hosted checkout page and Moyasar confirms asynchronously via webhook.
-- So this splits ticket purchase into two phases:
--   1. create_pending_ticket_order() — called from the buyer's browser
--      (anon), validates + records the order as 'pending'. No ticket rows
--      exist yet, so nothing is reserved from inventory at this point.
--   2. confirm_ticket_order() — called only by the webhook handler (server
--      code using the service-role client, never exposed to anon/
--      authenticated), creates the actual `tickets` rows once payment is
--      confirmed. This is also where final oversell protection kicks in,
--      via the existing on_ticket_insert trigger.
--
-- Trade-off: a pending order can still lose a race for the last few seats
-- to another order that gets confirmed first — confirm_ticket_order() then
-- raises, and the webhook handler must mark that order 'failed' and this
-- should trigger a refund via the Moyasar dashboard/API. Acceptable for an
-- MVP; a stronger reservation scheme (holding inventory during the pending
-- window with an expiry) would close this gap if it matters at your scale.

alter table public.ticket_orders
  add column if not exists ticket_type_id uuid references public.ticket_types (id),
  add column if not exists quantity int;

create or replace function public.create_pending_ticket_order(
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
begin
  select id, status, is_ticketing_enabled into v_event
  from public.events
  where slug = p_event_slug and deleted_at is null;

  if v_event.id is null or v_event.status <> 'published' or not v_event.is_ticketing_enabled then
    raise exception 'ticketing is not open for this event' using errcode = 'check_violation';
  end if;

  select id, price, currency, max_per_order, status, sale_start_at, sale_end_at,
         quantity_total, quantity_sold
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

  if v_ticket_type.quantity_sold + p_quantity > v_ticket_type.quantity_total then
    raise exception 'ticket_type % is sold out', p_ticket_type_id using errcode = 'check_violation';
  end if;

  v_total := v_ticket_type.price * p_quantity;

  insert into public.ticket_orders
    (event_id, buyer_name, buyer_email, buyer_phone, total_amount, currency,
     payment_status, payment_provider, ticket_type_id, quantity)
  values
    (v_event.id, p_buyer_name, p_buyer_email, p_buyer_phone, v_total, v_ticket_type.currency,
     'pending', 'moyasar', v_ticket_type.id, p_quantity)
  returning id into v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'total_amount', v_total,
    'currency', v_ticket_type.currency
  );
end;
$$;

revoke all on function public.create_pending_ticket_order(text, uuid, int, text, text, text) from public;
grant execute on function public.create_pending_ticket_order(text, uuid, int, text, text, text)
  to anon, authenticated;

-- Server-only (webhook handler via the service-role client). Not granted to
-- anon/authenticated — the payment_reference passed in must have already
-- been verified against Moyasar's webhook signature by the caller.
create or replace function public.confirm_ticket_order(
  p_order_id uuid,
  p_payment_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_ticket jsonb;
  v_tickets jsonb := '[]'::jsonb;
  i int;
begin
  select id, event_id, ticket_type_id, quantity, buyer_name, buyer_email, payment_status
  into v_order
  from public.ticket_orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'order not found' using errcode = 'no_data_found';
  end if;

  if v_order.payment_status = 'paid' then
    -- Already confirmed (webhook retry) — return the existing tickets.
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'qr_token', qr_token)), '[]'::jsonb)
    into v_tickets
    from public.tickets
    where order_id = v_order.id;

    return jsonb_build_object('order_id', v_order.id, 'tickets', v_tickets);
  end if;

  if v_order.payment_status <> 'pending' then
    raise exception 'order % is not pending', p_order_id using errcode = 'check_violation';
  end if;

  for i in 1..coalesce(v_order.quantity, 0) loop
    insert into public.tickets (order_id, ticket_type_id, event_id, holder_name, holder_email, price_paid)
    select v_order.id, v_order.ticket_type_id, v_order.event_id, v_order.buyer_name, v_order.buyer_email, tt.price
    from public.ticket_types tt
    where tt.id = v_order.ticket_type_id
    returning jsonb_build_object('id', id, 'qr_token', qr_token) into v_ticket;

    v_tickets := v_tickets || jsonb_build_array(v_ticket);
  end loop;

  update public.ticket_orders
  set payment_status = 'paid', payment_reference = p_payment_reference
  where id = v_order.id;

  return jsonb_build_object('order_id', v_order.id, 'tickets', v_tickets);
end;
$$;

revoke all on function public.confirm_ticket_order(uuid, text) from public;

-- Server-only (webhook handler on payment failure/expiry).
create or replace function public.fail_ticket_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ticket_orders
  set payment_status = 'failed'
  where id = p_order_id and payment_status = 'pending';
end;
$$;

revoke all on function public.fail_ticket_order(uuid) from public;

-- Public: lets the buyer's post-checkout success page poll for status
-- without exposing the ticket_orders table directly. Deliberately returns
-- only what's safe to show an anonymous visitor who merely knows the order
-- id (a UUID from their own redirect URL).
create or replace function public.get_order_status(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_tickets jsonb := '[]'::jsonb;
begin
  select payment_status, event_id into v_order
  from public.ticket_orders
  where id = p_order_id;

  if v_order.payment_status is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_order.payment_status = 'paid' then
    select coalesce(jsonb_agg(jsonb_build_object('qr_token', qr_token)), '[]'::jsonb)
    into v_tickets
    from public.tickets
    where order_id = p_order_id;
  end if;

  return jsonb_build_object('status', v_order.payment_status, 'tickets', v_tickets);
end;
$$;

revoke all on function public.get_order_status(uuid) from public;
grant execute on function public.get_order_status(uuid) to anon, authenticated;
