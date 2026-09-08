'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { checkInGuestByToken } from '@/lib/services/check-in.service';

export type CheckInActionState = {
  error?: 'unauthorized' | 'unknown' | 'invalidCode' | 'notFound' | 'notAttending';
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
  } catch {
    return { error: 'unknown' };
  }
}
