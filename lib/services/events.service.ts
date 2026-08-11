import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { EventFormOutput } from '@/lib/validations/events';
import type { EventSettingsFormOutput } from '@/lib/validations/event-settings';
import { slugify, randomSuffix } from '@/lib/utils/slug';
import { hashPassword } from '@/lib/utils/password';

type Client = SupabaseClient<Database>;
type EventRow = Database['public']['Tables']['events']['Row'];
type EventSettingsRow = Database['public']['Tables']['event_settings']['Row'];
type EventDesignRow = Database['public']['Tables']['event_designs']['Row'];

export async function getCurrentOrganizationId(
  supabase: Client,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.organization_id ?? null;
}

/**
 * Whether the organization has created any event yet — used to send a
 * brand-new account straight to "choose your track" instead of a stats
 * overview that's just empty/zero everywhere on a first login.
 */
export async function hasAnyEvents(supabase: Client, organizationId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function listEvents(supabase: Client, organizationId: string): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getEvent(
  supabase: Client,
  organizationId: string,
  eventId: string,
): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function generateUniqueSlug(supabase: Client, name: string): Promise<string> {
  const base = slugify(name);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return `${base}-${randomSuffix(8)}`;
}

export async function createEvent(
  supabase: Client,
  organizationId: string,
  userId: string,
  input: EventFormOutput,
): Promise<EventRow> {
  const slug = await generateUniqueSlug(supabase, input.name);
  const passwordHash =
    input.isPasswordProtected && input.password ? await hashPassword(input.password) : null;

  const { data, error } = await supabase
    .from('events')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      slug,
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      event_date: input.eventDate ?? null,
      rsvp_deadline: input.rsvpDeadline ?? null,
      location_text: input.locationText ?? null,
      location_map_url: input.locationMapUrl ?? null,
      cover_image_url: input.coverImageUrl ?? null,
      primary_locale: input.primaryLocale,
      visibility: input.visibility,
      is_rsvp_enabled: input.isRsvpEnabled,
      is_ticketing_enabled: input.isTicketingEnabled,
      is_qr_enabled: input.isQrEnabled,
      password_hash: passwordHash,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(
  supabase: Client,
  organizationId: string,
  eventId: string,
  input: EventFormOutput,
): Promise<EventRow> {
  let passwordHash: string | null;
  if (!input.isPasswordProtected) {
    passwordHash = null;
  } else if (input.password) {
    passwordHash = await hashPassword(input.password);
  } else {
    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('password_hash')
      .eq('id', eventId)
      .eq('organization_id', organizationId)
      .single();
    if (fetchError) throw fetchError;
    passwordHash = existing.password_hash;
  }

  const { data, error } = await supabase
    .from('events')
    .update({
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      event_date: input.eventDate ?? null,
      rsvp_deadline: input.rsvpDeadline ?? null,
      location_text: input.locationText ?? null,
      location_map_url: input.locationMapUrl ?? null,
      cover_image_url: input.coverImageUrl ?? null,
      primary_locale: input.primaryLocale,
      visibility: input.visibility,
      is_rsvp_enabled: input.isRsvpEnabled,
      is_ticketing_enabled: input.isTicketingEnabled,
      is_qr_enabled: input.isQrEnabled,
      password_hash: passwordHash,
    })
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function setEventStatus(
  supabase: Client,
  organizationId: string,
  eventId: string,
  status: EventRow['status'],
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)
    .eq('organization_id', organizationId);

  if (error) throw error;
}

export async function getEventSettings(
  supabase: Client,
  eventId: string,
): Promise<EventSettingsRow | null> {
  const { data, error } = await supabase
    .from('event_settings')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateEventSettings(
  supabase: Client,
  eventId: string,
  input: EventSettingsFormOutput,
): Promise<EventSettingsRow> {
  const { data, error } = await supabase
    .from('event_settings')
    .update({
      allow_maybe: input.allowMaybe,
      collect_companions: input.collectCompanions,
      max_companions: input.maxCompanions,
      collect_message: input.collectMessage,
      allow_guest_edit: input.allowGuestEdit,
    })
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Public, ticketed events for the homepage — anonymous visitors should be
 * able to discover and buy tickets without logging in or knowing a direct
 * link, not just organizers who already have their event's URL.
 */
export async function listPublicTicketedEvents(supabase: Client, limit = 6): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .eq('is_ticketing_enabled', true)
    .is('deleted_at', null)
    .order('event_date', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getPublicEventBySlug(
  supabase: Client,
  slug: string,
): Promise<{ event: EventRow; settings: EventSettingsRow; design: EventDesignRow } | null> {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!event) return null;

  const [{ data: settings, error: settingsError }, { data: design, error: designError }] =
    await Promise.all([
      supabase.from('event_settings').select('*').eq('event_id', event.id).single(),
      supabase.from('event_designs').select('*').eq('event_id', event.id).single(),
    ]);

  if (settingsError) throw settingsError;
  if (designError) throw designError;

  return { event, settings, design };
}

export async function softDeleteEvent(
  supabase: Client,
  organizationId: string,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('organization_id', organizationId);

  if (error) throw error;
}
