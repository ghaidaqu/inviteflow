import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;
type GuestRow = Database['public']['Tables']['guests']['Row'];
type RsvpResponseRow = Database['public']['Tables']['rsvp_responses']['Row'];

export type GuestWithResponse = GuestRow & { response: RsvpResponseRow | null };

export async function listGuestsWithResponses(
  supabase: Client,
  eventId: string,
): Promise<GuestWithResponse[]> {
  const { data: guests, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (guests.length === 0) return [];

  const { data: responses, error: responsesError } = await supabase
    .from('rsvp_responses')
    .select('*')
    .in(
      'guest_id',
      guests.map((g) => g.id),
    );

  if (responsesError) throw responsesError;

  return guests.map((guest) => ({
    ...guest,
    response: responses.find((r) => r.guest_id === guest.id) ?? null,
  }));
}

/**
 * Organizer-initiated guest creation — distinct from the public
 * `submit_rsvp` RPC (which creates a guest *and* their response together
 * when they respond themselves). A manually-added guest has no response
 * yet; they show up as "no response" in the guest list until they use
 * their invite link, exactly like a guest who hasn't replied yet.
 */
export async function createGuestManually(
  supabase: Client,
  eventId: string,
  input: { name: string; phone: string | null; email: string | null },
): Promise<GuestRow> {
  const { data, error } = await supabase
    .from('guests')
    .insert({
      event_id: eventId,
      name: input.name,
      phone: input.phone,
      email: input.email,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGuest(supabase: Client, guestId: string): Promise<void> {
  // RLS on `guests` already restricts this update to members of the event's
  // organization, so no extra organization check is needed here.
  const { error } = await supabase
    .from('guests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', guestId);

  if (error) throw error;
}
