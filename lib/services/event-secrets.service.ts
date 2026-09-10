import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The two per-event values no client may ever read: the password hash of
 * a protected event, and the door-staff link's token.
 *
 * They used to be columns on `events`, which has an RLS policy letting
 * anyone read a published public event — RLS is row-level, so `select=*`
 * with the anon key handed both out. See 20260910000002. Everything here
 * goes through the service role, because `event_secrets` denies anon and
 * authenticated outright; authorization is the caller's job and every
 * caller below already establishes it (organization ownership, or the
 * token itself as the credential).
 */

/** Whether a guest has to enter a password to open this event. */
export async function eventHasPassword(eventId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('event_secrets')
    .select('password_hash')
    .eq('event_id', eventId)
    .maybeSingle();
  return Boolean(data?.password_hash);
}

/** The stored hash, for verifying a guest's attempt. Never returned to a client. */
export async function getEventPasswordHash(eventId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('event_secrets')
    .select('password_hash')
    .eq('event_id', eventId)
    .maybeSingle();
  return data?.password_hash ?? null;
}

/** Upserts rather than updates: an event created before the secrets table
 *  existed has no row until something writes one. */
export async function setEventPasswordHash(eventId: string, hash: string | null): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_secrets')
    .upsert({ event_id: eventId, password_hash: hash }, { onConflict: 'event_id' });
  if (error) throw error;
}

/** The door-staff link's token, for showing the organizer their own link. */
export async function getCheckInToken(eventId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('event_secrets')
    .select('check_in_token')
    .eq('event_id', eventId)
    .maybeSingle();
  return data?.check_in_token ?? null;
}

/** Rotating the token silently invalidates every link already handed out. */
export async function setCheckInToken(eventId: string, token: string): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_secrets')
    .upsert({ event_id: eventId, check_in_token: token }, { onConflict: 'event_id' });
  if (error) throw error;
}

/** Resolves a door-staff token to the event it opens, or null. The token
 *  is the only credential, so it is matched exactly and nothing is
 *  returned unless it hits. */
export async function findEventIdByCheckInToken(token: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('event_secrets')
    .select('event_id')
    .eq('check_in_token', token)
    .maybeSingle();
  return data?.event_id ?? null;
}
