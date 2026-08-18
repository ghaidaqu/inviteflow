import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type DashboardStats = {
  totalEvents: number;
  totalGuests: number;
  attendingCount: number;
  notAttendingCount: number;
  noResponseCount: number;
  latestResponses: {
    id: string;
    guestName: string;
    eventName: string;
    status: 'attending' | 'not_attending';
    respondedAt: string;
  }[];
};

const EMPTY_STATS: DashboardStats = {
  totalEvents: 0,
  totalGuests: 0,
  attendingCount: 0,
  notAttendingCount: 0,
  noResponseCount: 0,
  latestResponses: [],
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

  const [{ data: guests, error: guestsError }, { data: responses, error: responsesError }] =
    await Promise.all([
      supabase.from('guests').select('id').in('event_id', eventIds).is('deleted_at', null),
      supabase
        .from('rsvp_responses')
        .select('id, guest_id, event_id, status, responded_at')
        .in('event_id', eventIds)
        .order('responded_at', { ascending: false }),
    ]);

  if (guestsError) throw guestsError;
  if (responsesError) throw responsesError;

  const attendingCount = responses.filter((r) => r.status === 'attending').length;
  const notAttendingCount = responses.filter((r) => r.status === 'not_attending').length;
  const noResponseCount = Math.max(guests.length - responses.length, 0);

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

  return {
    totalEvents: events.length,
    totalGuests: guests.length,
    attendingCount,
    notAttendingCount,
    noResponseCount,
    latestResponses,
  };
}
