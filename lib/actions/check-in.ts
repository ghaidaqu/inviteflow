'use server';

import { randomUUID } from 'node:crypto';
import { reportActionError } from '@/lib/utils/report-error';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { checkInGuestByToken, getEventByCheckInToken } from '@/lib/services/check-in.service';
import { checkRateLimit } from '@/lib/utils/rate-limit';

export type CheckInActionState = {
  error?:
    | 'unauthorized'
    | 'unknown'
    | 'invalidCode'
    | 'notFound'
    | 'notAttending'
    | 'linkExpired'
    | 'rateLimited';
  alreadyCheckedIn?: boolean;
  guestName?: string;
  partySize?: number;
  /** Only set when alreadyCheckedIn — when their pass was actually used,
   *  so door staff catching a repeat scan can see it wasn't just now. */
  checkedInAt?: string;
};

/**
 * The scanned QR's payload is a full URL (the guest's own RSVP edit
 * link — see generateAndUploadEntryCard), not a bare token, so this
 * pulls the token back out the same way a browser would: whatever comes
 * after the last "/". Any other scanned code (a random QR that isn't
 * one of ours) fails the UUID shape check right after and is reported as
 * 'invalidCode' rather than a false "not found".
 */
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractToken(scanned: string): string | null {
  const trimmed = scanned.trim();
  const candidate = trimmed.includes('/') ? trimmed.slice(trimmed.lastIndexOf('/') + 1) : trimmed;
  return TOKEN_RE.test(candidate) ? candidate : null;
}

export async function checkInGuestAction(
  eventId: string,
  scannedText: string,
): Promise<CheckInActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  const token = extractToken(scannedText);
  if (!token) return { error: 'invalidCode' };

  try {
    const result = await checkInGuestByToken(supabase, eventId, token);
    if (!result.ok) {
      return { error: result.reason === 'not_found' ? 'notFound' : 'notAttending' };
    }
    return {
      alreadyCheckedIn: result.alreadyCheckedIn,
      guestName: result.guestName,
      partySize: result.partySize,
      checkedInAt: result.alreadyCheckedIn ? result.checkedInAt : undefined,
    };
  } catch (error) {
    reportActionError('check-in', error);
    return { error: 'unknown' };
  }
}

/**
 * Issues a fresh door-staff secret for one event, which is also how the
 * old link gets revoked — there's only ever one valid token per event, so
 * replacing it silently kills every copy of the previous URL sitting in
 * someone's WhatsApp. For the ordinary "the event is over" case nobody
 * needs to press this at all (see STAFF_LINK_GRACE_MS); it's for the
 * cases that can't wait, like different door staff between two events.
 */
export async function regenerateCheckInTokenAction(
  eventId: string,
): Promise<{ error?: 'unauthorized' | 'unknown'; token?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const token = randomUUID();
  const { error } = await supabase
    .from('events')
    .update({ check_in_token: token })
    .eq('id', eventId)
    // Belt and braces alongside RLS: an id from another organization
    // matches no row here rather than quietly rotating someone else's.
    .eq('organization_id', organizationId);
  if (error) return { error: 'unknown' };

  revalidatePath(`/${await getLocale()}/dashboard/events/${eventId}/check-in`);
  return { token };
}

/**
 * The same scan, but for the door-staff link — someone the organizer
 * handed a URL to, with no account here at all (see
 * getEventByCheckInToken). The secret in the URL is the only credential,
 * so this runs on the admin client after resolving it, and never accepts
 * an event id from the caller: the token alone decides which event is
 * being worked, so holding one link can't be turned into checking guests
 * in at a different event.
 *
 * Rate-limited per link because, unlike the dashboard scanner, this
 * endpoint is reachable by anyone who has the URL — a leaked link
 * shouldn't also be a way to probe guest tokens at speed.
 */
export async function publicCheckInAction(
  checkInToken: string,
  scannedText: string,
): Promise<CheckInActionState> {
  const event = await getEventByCheckInToken(checkInToken);
  if (!event) return { error: 'linkExpired' };

  const token = extractToken(scannedText);
  if (!token) return { error: 'invalidCode' };

  try {
    const admin = createAdminClient();
    const allowed = await checkRateLimit({
      action: 'public-check-in',
      scope: checkInToken,
      maxHits: 120,
      windowSeconds: 60,
    });
    if (!allowed) return { error: 'rateLimited' };

    const result = await checkInGuestByToken(admin, event.id, token);
    if (!result.ok) {
      return { error: result.reason === 'not_found' ? 'notFound' : 'notAttending' };
    }
    return {
      alreadyCheckedIn: result.alreadyCheckedIn,
      guestName: result.guestName,
      partySize: result.partySize,
      checkedInAt: result.alreadyCheckedIn ? result.checkedInAt : undefined,
    };
  } catch (error) {
    reportActionError('check-in', error);
    return { error: 'unknown' };
  }
}
