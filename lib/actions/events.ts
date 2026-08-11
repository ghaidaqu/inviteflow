'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { eventFormSchema } from '@/lib/validations/events';
import { eventSettingsFormSchema } from '@/lib/validations/event-settings';
import { questionsFormSchema } from '@/lib/validations/questions';
import {
  createEvent,
  updateEvent,
  setEventStatus,
  softDeleteEvent,
  getCurrentOrganizationId,
  getEvent,
  updateEventSettings,
} from '@/lib/services/events.service';
import { replaceQuestions } from '@/lib/services/questions.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type EventActionState = {
  error?: string;
};

function readFormInput(formData: FormData) {
  return {
    name: formData.get('name'),
    type: formData.get('type'),
    description: formData.get('description'),
    eventDate: formData.get('eventDate'),
    rsvpDeadline: formData.get('rsvpDeadline'),
    locationText: formData.get('locationText'),
    locationMapUrl: formData.get('locationMapUrl'),
    coverImageUrl: formData.get('coverImageUrl'),
    primaryLocale: formData.get('primaryLocale'),
    visibility: formData.get('visibility'),
    isRsvpEnabled: formData.get('isRsvpEnabled') === 'true',
    isTicketingEnabled: formData.get('isTicketingEnabled') === 'true',
    isQrEnabled: formData.get('isQrEnabled') === 'true',
    isPasswordProtected: formData.get('isPasswordProtected') === 'true',
    password: formData.get('password'),
  };
}

// Best-effort save for the questions an organizer wrote inline on the RSVP
// creation form. Deliberately never throws: the event itself already
// validated and was created successfully by the time this runs, and the
// organizer can always add/fix questions afterward from the RSVP settings
// page — a malformed or empty inline draft shouldn't roll back or fail the
// whole "create event" submission.
async function saveInlineQuestions(
  supabase: SupabaseClient<Database>,
  eventId: string,
  formData: FormData,
): Promise<void> {
  const raw = formData.get('questions');
  if (typeof raw !== 'string' || !raw.trim()) return;

  try {
    const parsedJson: unknown = JSON.parse(raw);
    const parsed = questionsFormSchema.safeParse({ questions: parsedJson });
    if (parsed.success && parsed.data.questions.length > 0) {
      await replaceQuestions(supabase, eventId, parsed.data.questions);
    }
  } catch {
    // Ignore — see doc comment above.
  }
}

export async function createEventAction(
  _prevState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventFormSchema.safeParse(readFormInput(formData));
  if (!parsed.success) {
    return { error: 'invalidInput' };
  }

  // Ticketing and RSVP are locked platform-wide for now — the chooser page
  // and the /new/[track] route already keep the UI from getting here, but
  // this is the actual enforcement point in case someone crafts a request
  // directly (e.g. toggling "enable ticketing" on what looked like an
  // invitation-track submission).
  if (parsed.data.isTicketingEnabled || !parsed.data.isRsvpEnabled) {
    return { error: 'trackLocked' };
  }

  if (parsed.data.isPasswordProtected && !parsed.data.password) {
    return { error: 'passwordRequiredForProtection' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const locale = await getLocale();
  let eventId: string;
  try {
    const event = await createEvent(supabase, organizationId, user.id, parsed.data);
    eventId = event.id;
  } catch {
    return { error: 'unknown' };
  }

  await saveInlineQuestions(supabase, eventId, formData);

  revalidatePath(`/${locale}/dashboard/events`);
  redirect(`/${locale}/dashboard/events/${eventId}`);
}

export async function updateEventAction(
  eventId: string,
  _prevState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventFormSchema.safeParse(readFormInput(formData));
  if (!parsed.success) {
    return { error: 'invalidInput' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  if (parsed.data.isPasswordProtected && !parsed.data.password) {
    const existing = await getEvent(supabase, organizationId, eventId);
    if (!existing?.password_hash) {
      return { error: 'passwordRequiredForProtection' };
    }
  }

  const locale = await getLocale();
  try {
    await updateEvent(supabase, organizationId, eventId, parsed.data);
  } catch {
    return { error: 'unknown' };
  }

  revalidatePath(`/${locale}/dashboard/events`);
  revalidatePath(`/${locale}/dashboard/events/${eventId}`);
  redirect(`/${locale}/dashboard/events/${eventId}`);
}

export async function setEventStatusAction(
  eventId: string,
  status: 'draft' | 'published' | 'ended',
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return;

  await setEventStatus(supabase, organizationId, eventId, status);

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events`);
  revalidatePath(`/${locale}/dashboard/events/${eventId}`);
}

export type EventSettingsActionState = {
  error?: string;
  success?: boolean;
};

export async function updateEventSettingsAction(
  eventId: string,
  _prevState: EventSettingsActionState,
  formData: FormData,
): Promise<EventSettingsActionState> {
  const parsed = eventSettingsFormSchema.safeParse({
    allowMaybe: formData.get('allowMaybe') === 'true',
    collectCompanions: formData.get('collectCompanions') === 'true',
    maxCompanions: formData.get('maxCompanions'),
    collectMessage: formData.get('collectMessage') === 'true',
    allowGuestEdit: formData.get('allowGuestEdit') === 'true',
  });
  if (!parsed.success) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  // Ownership check — updateEventSettings itself relies on RLS, but this
  // confirms the event actually belongs to the caller's organization first.
  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  try {
    await updateEventSettings(supabase, eventId, parsed.data);
  } catch {
    return { error: 'unknown' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/rsvp`);
  return { success: true };
}

export async function deleteEventAction(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return;

  await softDeleteEvent(supabase, organizationId, eventId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events`);
  redirect(`/${locale}/dashboard/events`);
}
