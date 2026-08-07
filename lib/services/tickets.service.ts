import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { TicketTypeFormOutput } from '@/lib/validations/tickets';

type Client = SupabaseClient<Database>;
type TicketTypeRow = Database['public']['Tables']['ticket_types']['Row'];
type TicketRow = Database['public']['Tables']['tickets']['Row'];
type TicketOrderRow = Database['public']['Tables']['ticket_orders']['Row'];

export async function listTicketTypes(supabase: Client, eventId: string): Promise<TicketTypeRow[]> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getTicketType(
  supabase: Client,
  eventId: string,
  ticketTypeId: string,
): Promise<TicketTypeRow | null> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTicketType(
  supabase: Client,
  eventId: string,
  input: TicketTypeFormOutput,
): Promise<TicketTypeRow> {
  const { data, error } = await supabase
    .from('ticket_types')
    .insert({
      event_id: eventId,
      name_ar: input.nameAr,
      name_en: input.nameEn ?? null,
      price: input.price,
      currency: input.currency,
      quantity_total: input.quantityTotal,
      max_per_order: input.maxPerOrder,
      sale_start_at: input.saleStartAt ?? null,
      sale_end_at: input.saleEndAt ?? null,
      status: input.status,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTicketType(
  supabase: Client,
  eventId: string,
  ticketTypeId: string,
  input: TicketTypeFormOutput,
): Promise<TicketTypeRow> {
  const { data, error } = await supabase
    .from('ticket_types')
    .update({
      name_ar: input.nameAr,
      name_en: input.nameEn ?? null,
      price: input.price,
      currency: input.currency,
      quantity_total: input.quantityTotal,
      max_per_order: input.maxPerOrder,
      sale_start_at: input.saleStartAt ?? null,
      sale_end_at: input.saleEndAt ?? null,
      status: input.status,
    })
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function softDeleteTicketType(
  supabase: Client,
  eventId: string,
  ticketTypeId: string,
): Promise<void> {
  const { error } = await supabase
    .from('ticket_types')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', ticketTypeId)
    .eq('event_id', eventId);

  if (error) throw error;
}

export type TicketWithContext = TicketRow & {
  ticketTypeName: string;
  order: TicketOrderRow | null;
};

export async function listTicketsForEvent(
  supabase: Client,
  eventId: string,
): Promise<TicketWithContext[]> {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (tickets.length === 0) return [];

  const [{ data: ticketTypes, error: typesError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase.from('ticket_types').select('id, name_ar').eq('event_id', eventId),
      supabase
        .from('ticket_orders')
        .select('*')
        .in('id', Array.from(new Set(tickets.map((t) => t.order_id)))),
    ]);

  if (typesError) throw typesError;
  if (ordersError) throw ordersError;

  return tickets.map((ticket) => ({
    ...ticket,
    ticketTypeName: ticketTypes.find((tt) => tt.id === ticket.ticket_type_id)?.name_ar ?? '',
    order: orders.find((o) => o.id === ticket.order_id) ?? null,
  }));
}

export type PublicTicket = {
  ticket: {
    id: string;
    holder_name: string;
    status: 'valid' | 'used' | 'cancelled';
    qr_token: string;
    price_paid: number;
    created_at: string;
  };
  ticket_type: { name_ar: string; name_en: string | null };
  event: {
    id: string;
    slug: string;
    name: string;
    event_date: string | null;
    location_text: string | null;
    location_map_url: string | null;
  };
};

export async function getTicketByQrToken(
  supabase: Client,
  qrToken: string,
): Promise<PublicTicket | null> {
  const { data, error } = await supabase.rpc('get_ticket_by_qr_token', { p_qr_token: qrToken });
  if (error) throw error;
  if (!data) return null;
  return data as unknown as PublicTicket;
}

/** Public: ticket types currently visible for purchase (RLS-gated to published+public events). */
export async function listPublicTicketTypes(
  supabase: Client,
  eventId: string,
): Promise<TicketTypeRow[]> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('price', { ascending: true });

  if (error) throw error;
  return data;
}
