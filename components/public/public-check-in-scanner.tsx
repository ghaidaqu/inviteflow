'use client';

import { useCallback } from 'react';
import { GuestCheckInScanner } from '@/components/dashboard/guest-check-in-scanner';
import { publicCheckInAction } from '@/lib/actions/check-in';

/**
 * Thin client wrapper that binds the shared scanner to the door-staff
 * link's own token. Exists because the scanner takes its scan handler as
 * a prop and a server component can't hand it a closure — this is that
 * closure, and nothing more.
 *
 * `eventId` is deliberately empty: on this path the token decides the
 * event server-side (see publicCheckInAction), so the browser is never
 * trusted with — or even told — which event id it's working.
 */
export function PublicCheckInScanner({ checkInToken }: { checkInToken: string }) {
  const scan = useCallback(
    (scannedText: string) => publicCheckInAction(checkInToken, scannedText),
    [checkInToken],
  );

  return <GuestCheckInScanner eventId="" scan={scan} />;
}
