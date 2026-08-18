import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/types/supabase';

type Client = SupabaseClient<Database>;
type AnswerInput = { question_id: string; answer_value: Json };

export type RsvpByToken = {
  guest: { id: string; name: string | null; phone: string | null; email: string | null };
  event: { id: string; slug: string; name: string; rsvp_deadline: string | null };
  /**
   * get_rsvp_by_token LEFT JOINs rsvp_responses, so every field here is
   * genuinely null (not just absent) for a guest who hasn't responded at
   * all yet — reachable whenever their invite link is opened before they
   * tap Accept/Decline. Every field is nullable to match that reality;
   * callers must not assume a response already exists.
   */
  response: {
    id: string | null;
    status: 'attending' | 'not_attending' | null;
    companions_count: number | null;
    companions_names: string[] | null;
    message: string | null;
    responded_at: string | null;
  };
  answers: AnswerInput[];
};

export async function submitRsvp(
  supabase: Client,
  params: {
    eventSlug: string;
    guestName: string;
    phone: string | null;
    email: string | null;
    status: 'attending' | 'not_attending';
    companionsCount: number;
    companionsNames: string[];
    message: string | null;
    answers: AnswerInput[];
  },
) {
  const { data, error } = await supabase.rpc('submit_rsvp', {
    p_event_slug: params.eventSlug,
    p_guest_name: params.guestName,
    p_phone: params.phone,
    p_email: params.email,
    p_status: params.status,
    p_companions_count: params.companionsCount,
    p_companions_names: params.companionsNames,
    p_message: params.message,
    p_answers: params.answers,
  });

  if (error) throw error;
  return data[0];
}

export async function getRsvpByToken(supabase: Client, token: string): Promise<RsvpByToken | null> {
  const { data, error } = await supabase.rpc('get_rsvp_by_token', { p_secure_token: token });
  if (error) throw error;
  if (!data) return null;
  return data as unknown as RsvpByToken;
}

export async function updateRsvpByToken(
  supabase: Client,
  params: {
    token: string;
    status: 'attending' | 'not_attending';
    companionsCount: number;
    companionsNames: string[];
    message: string | null;
    /**
     * `null` means "leave existing question answers untouched" — the RPC
     * only deletes+replaces answers when this is non-null. Pass an actual
     * array (even `[]`) only when the caller genuinely means to replace the
     * full answer set (see components/public/rsvp-questions-form.tsx).
     */
    answers: AnswerInput[] | null;
  },
) {
  const { data, error } = await supabase.rpc('update_rsvp_by_token', {
    p_secure_token: params.token,
    p_status: params.status,
    p_companions_count: params.companionsCount,
    p_companions_names: params.companionsNames,
    p_message: params.message,
    p_answers: params.answers,
  });

  if (error) throw error;
  // event_id + previous_status let the caller detect a genuine new decline
  // (to trigger waitlist promotion) versus a repeat/no-op resubmission.
  return data[0];
}

/**
 * update_rsvp_by_token (an UPDATE) deliberately raises 'no existing rsvp
 * response to update' (P0002) for a guest with an invitation but no
 * response yet — reachable whenever their invite link is opened, or their
 * first response submitted, before ever tapping Accept/Decline in
 * WhatsApp (get_rsvp_by_token's LEFT JOIN already reflects this
 * possibility, see RsvpByToken). updateRsvpAction falls back to this on
 * that specific error instead of failing the guest's first response.
 * Mirrors the response half of submit_rsvp's own validation and insert
 * shape — the guest itself already exists here, so only the response
 * needs creating. Uses the admin client: this genuinely needs to bypass
 * RLS the same way the security-definer RPCs do.
 */
export async function insertFirstResponseByToken(
  token: string,
  params: {
    status: 'attending' | 'not_attending';
    companionsCount: number;
    companionsNames: string[];
    message: string | null;
    answers?: AnswerInput[] | null;
  },
): Promise<{ event_id: string; event_slug: string; previous_status: null }> {
  const admin = createAdminClient();

  const { data: guest, error: guestError } = await admin
    .from('guests')
    .select('id, event_id')
    .eq('secure_token', token)
    .is('deleted_at', null)
    .single();
  if (guestError || !guest) throw new Error('invalid token');

  const { data: event, error: eventError } = await admin
    .from('events')
    .select(
      'id, slug, status, is_rsvp_enabled, rsvp_deadline, event_settings(allow_attending, allow_not_attending, max_companions)',
    )
    .eq('id', guest.event_id)
    .single();
  if (eventError || !event) throw new Error('event not found');

  const settings = event.event_settings as unknown as {
    allow_attending: boolean;
    allow_not_attending: boolean;
    max_companions: number;
  } | null;

  if (event.status !== 'published' || !event.is_rsvp_enabled) {
    throw new Error('rsvp is not open for this event');
  }
  if (event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()) {
    throw new Error('rsvp deadline has passed');
  }
  if (
    (params.status === 'attending' && settings?.allow_attending === false) ||
    (params.status === 'not_attending' && settings?.allow_not_attending === false)
  ) {
    throw new Error('response option is not allowed for this event');
  }
  if (params.companionsCount > (settings?.max_companions ?? 0)) {
    throw new Error('companions count exceeds the allowed maximum');
  }

  const { data: response, error: insertError } = await admin
    .from('rsvp_responses')
    .insert({
      event_id: guest.event_id,
      guest_id: guest.id,
      status: params.status,
      companions_count: params.companionsCount,
      companions_names: params.companionsNames,
      message: params.message,
    })
    .select('id')
    .single();
  if (insertError || !response) throw insertError ?? new Error('failed to create response');

  if (params.answers && params.answers.length > 0) {
    const { error: answersError } = await admin.from('custom_answers').insert(
      params.answers.map((a) => ({
        response_id: response.id,
        question_id: a.question_id,
        answer_value: a.answer_value,
      })),
    );
    if (answersError) throw answersError;
  }

  return { event_id: guest.event_id, event_slug: event.slug, previous_status: null };
}
