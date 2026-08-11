import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type DashboardStats = {
  totalEvents: number;
  totalGuests: number;
  attendingCount: number;
  notAttendingCount: number;
  maybeCount: number;
  noResponseCount: number;
  ticketsSold: number;
  ticketsRemaining: number;
  totalRevenue: number;
  checkedInCount: number;
  latestResponses: {
    id: string;
    guestName: string;
    eventName: string;
    status: 'attending' | 'not_attending' | 'maybe';
    respondedAt: string;
  }[];
  latestCheckIns: {
    id: string;
    holderName: string;
    eventName: string;
    checkedInAt: string;
  }[];
};

const EMPTY_STATS: DashboardStats = {
  totalEvents: 0,
  totalGuests: 0,
  attendingCount: 0,
  notAttendingCount: 0,
  maybeCount: 0,
  noResponseCount: 0,
  ticketsSold: 0,
  ticketsRemaining: 0,
  totalRevenue: 0,
  checkedInCount: 0,
  latestResponses: [],
  latestCheckIns: [],
};

export async function getDashboardStats(
  supabase: Client,
  organizationId: string,
): Promise<DashboardStats> {
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (eventsError) throw eventsError;
  if (events.length === 0) return EMPTY_STATS;

  const eventIds = events.map((e) => e.id);
  const eventNameById = new Map(events.map((e) => [e.id, e.name]));

  const [
    { data: guests, error: guestsError },
    { data: responses, error: responsesError },
    { data: ticketTypes, error: ticketTypesError },
    { data: paidOrders, error: ordersError },
    { data: usedTickets, error: usedTicketsError },
  ] = await Promise.all([
    supabase.from('guests').select('id').in('event_id', eventIds).is('deleted_at', null),
    supabase
      .from('rsvp_responses')
      .select('id, guest_id, event_id, status, responded_at')
      .in('event_id', eventIds)
      .order('responded_at', { ascending: false }),
    supabase.from('ticket_types').select('quantity_total, quantity_sold').in('event_id', eventIds),
    supabase
      .from('ticket_orders')
      .select('total_amount')
      .in('event_id', eventIds)
      .eq('payment_status', 'paid'),
    supabase.from('tickets').select('id').in('event_id', eventIds).eq('status', 'used'),
  ]);

  if (guestsError) throw guestsError;
  if (responsesError) throw responsesError;
  if (ticketTypesError) throw ticketTypesError;
  if (ordersError) throw ordersError;
  if (usedTicketsError) throw usedTicketsError;

  const attendingCount = responses.filter((r) => r.status === 'attending').length;
  const notAttendingCount = responses.filter((r) => r.status === 'not_attending').length;
  const maybeCount = responses.filter((r) => r.status === 'maybe').length;
  const noResponseCount = Math.max(guests.length - responses.length, 0);

  const ticketsSold = ticketTypes.reduce((sum, tt) => sum + tt.quantity_sold, 0);
  const ticketsRemaining = ticketTypes.reduce(
    (sum, tt) => sum + Math.max(tt.quantity_total - tt.quantity_sold, 0),
    0,
  );
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const latestResponseRows = responses.slice(0, 20);
  const guestIds = latestResponseRows.map((r) => r.guest_id);
  const { data: guestNames, error: guestNamesError } =
    guestIds.length > 0
      ? await supabase.from('guests').select('id, name').in('id', guestIds)
      : { data: [], error: null };
  if (guestNamesError) throw guestNamesError;
  const guestNameById = new Map((guestNames ?? []).map((g) => [g.id, g.name]));

  const latestResponses = latestResponseRows.map((r) => ({
    id: r.id,
    guestName: guestNameById.get(r.guest_id) ?? '',
    eventName: eventNameById.get(r.event_id) ?? '',
    status: r.status,
    respondedAt: r.responded_at,
  }));

  const { data: checkIns, error: checkInsError } = await supabase
    .from('ticket_check_ins')
    .select('id, ticket_id, checked_in_at')
    .order('checked_in_at', { ascending: false })
    .limit(5);
  if (checkInsError) throw checkInsError;

  const ticketIds = checkIns.map((c) => c.ticket_id);
  const { data: ticketsForCheckIns, error: ticketsForCheckInsError } =
    ticketIds.length > 0
      ? await supabase.from('tickets').select('id, holder_name, event_id').in('id', ticketIds)
      : { data: [], error: null };
  if (ticketsForCheckInsError) throw ticketsForCheckInsError;

  const ticketById = new Map((ticketsForCheckIns ?? []).map((t) => [t.id, t]));
  const latestCheckIns = checkIns
    .map((c) => {
      const ticket = ticketById.get(c.ticket_id);
      if (!ticket || !eventIds.includes(ticket.event_id)) return null;
      return {
        id: c.id,
        holderName: ticket.holder_name,
        eventName: eventNameById.get(ticket.event_id) ?? '',
        checkedInAt: c.checked_in_at,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return {
    totalEvents: events.length,
    totalGuests: guests.length,
    attendingCount,
    notAttendingCount,
    maybeCount,
    noResponseCount,
    ticketsSold,
    ticketsRemaining,
    totalRevenue,
    checkedInCount: usedTickets.length,
    latestResponses,
    latestCheckIns,
  };
}
