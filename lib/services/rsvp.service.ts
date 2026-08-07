import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';

type Client = SupabaseClient<Database>;
type AnswerInput = { question_id: string; answer_value: Json };

export type RsvpByToken = {
  guest: { id: string; name: string | null; phone: string | null; email: string | null };
  event: { id: string; slug: string; name: string; rsvp_deadline: string | null };
  response: {
    id: string;
    status: 'attending' | 'not_attending' | 'maybe';
    companions_count: number;
    companions_names: string[];
    message: string | null;
    responded_at: string;
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
    status: 'attending' | 'not_attending' | 'maybe';
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
    status: 'attending' | 'not_attending' | 'maybe';
    companionsCount: number;
    companionsNames: string[];
    message: string | null;
    answers: AnswerInput[];
  },
) {
  const { error } = await supabase.rpc('update_rsvp_by_token', {
    p_secure_token: params.token,
    p_status: params.status,
    p_companions_count: params.companionsCount,
    p_companions_names: params.companionsNames,
    p_message: params.message,
    p_answers: params.answers,
  });

  if (error) throw error;
}
