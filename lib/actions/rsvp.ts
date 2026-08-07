'use server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { rsvpFormSchema, rsvpStatuses } from '@/lib/validations/rsvp';
import { submitRsvp, updateRsvpByToken } from '@/lib/services/rsvp.service';
import type { Json } from '@/types/supabase';

export type RsvpActionState = {
  error?: string;
  secureToken?: string;
  success?: boolean;
};

function readAnswers(formData: FormData): { question_id: string; answer_value: Json }[] {
  const raw = formData.get('answers');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function readCompanionsNames(formData: FormData): string[] {
  const raw = formData.get('companionsNames');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string' && n) : [];
  } catch {
    return [];
  }
}

export async function submitRsvpAction(
  eventSlug: string,
  _prevState: RsvpActionState,
  formData: FormData,
): Promise<RsvpActionState> {
  if (!isSupabaseConfigured()) return { error: 'notConfigured' };

  const status = formData.get('status');
  const parsed = rsvpFormSchema.safeParse({
    guestName: formData.get('guestName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    status,
    companionsNames: readCompanionsNames(formData).map((name) => ({ name })),
    message: formData.get('message'),
  });

  if (!parsed.success || !rsvpStatuses.includes(parsed.data.status)) {
    return { error: 'invalidInput' };
  }

  const supabase = await createClient();

  try {
    const result = await submitRsvp(supabase, {
      eventSlug,
      guestName: parsed.data.guestName,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      status: parsed.data.status,
      companionsCount: parsed.data.companionsNames.length,
      companionsNames: parsed.data.companionsNames.map((c) => c.name),
      message: parsed.data.message ?? null,
      answers: readAnswers(formData),
    });

    return { success: true, secureToken: result.secure_token };
  } catch {
    return { error: 'submitFailed' };
  }
}

export async function updateRsvpAction(
  token: string,
  _prevState: RsvpActionState,
  formData: FormData,
): Promise<RsvpActionState> {
  if (!isSupabaseConfigured()) return { error: 'notConfigured' };

  const status = formData.get('status');
  const parsed = rsvpFormSchema.omit({ guestName: true, phone: true, email: true }).safeParse({
    status,
    companionsNames: readCompanionsNames(formData).map((name) => ({ name })),
    message: formData.get('message'),
  });

  if (!parsed.success || !rsvpStatuses.includes(parsed.data.status)) {
    return { error: 'invalidInput' };
  }

  const supabase = await createClient();

  try {
    await updateRsvpByToken(supabase, {
      token,
      status: parsed.data.status,
      companionsCount: parsed.data.companionsNames.length,
      companionsNames: parsed.data.companionsNames.map((c) => c.name),
      message: parsed.data.message ?? null,
      answers: readAnswers(formData),
    });

    return { success: true };
  } catch {
    return { error: 'submitFailed' };
  }
}
