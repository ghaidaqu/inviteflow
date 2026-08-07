-- Public lookup of a single ticket by its QR token (for the public ticket
-- page). tickets/ticket_types/events have no anon SELECT policy, so this
-- SECURITY DEFINER function is the only way a ticket holder can view their
-- own ticket — matching the same pattern as get_rsvp_by_token.
create or replace function public.get_ticket_by_qr_token(p_qr_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ticket', jsonb_build_object(
      'id', t.id,
      'holder_name', t.holder_name,
      'status', t.status,
      'qr_token', t.qr_token,
      'price_paid', t.price_paid,
      'created_at', t.created_at
    ),
    'ticket_type', jsonb_build_object(
      'name_ar', tt.name_ar,
      'name_en', tt.name_en
    ),
    'event', jsonb_build_object(
      'id', e.id,
      'slug', e.slug,
      'name', e.name,
      'event_date', e.event_date,
      'location_text', e.location_text,
      'location_map_url', e.location_map_url
    )
  )
  from public.tickets t
  join public.ticket_types tt on tt.id = t.ticket_type_id
  join public.events e on e.id = t.event_id
  where t.qr_token = p_qr_token;
$$;

grant execute on function public.get_ticket_by_qr_token(uuid) to anon, authenticated;
