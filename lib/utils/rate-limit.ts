import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Best-effort client IP for rate-limiting purposes only — never use this for
 * security decisions that require a trustworthy identity. Vercel (and most
 * reverse proxies) set `x-forwarded-for` to a client-controlled value that
 * can be spoofed, but for throttling anonymous spam it's good enough.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  const realIp = h.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

type RateLimitOptions = {
  /** Logical bucket name, e.g. "rsvp" or "cover-upload". */
  action: string;
  /** Extra identifier to key on in addition to IP (e.g. an event slug). */
  scope?: string;
  maxHits: number;
  windowSeconds: number;
  /** What to answer when the limiter itself cannot be reached. 'allow'
   *  keeps real users moving through a database hiccup; 'deny' is for the
   *  paths where an outage would hand an abuser unlimited sends or
   *  uploads on our bill. */
  onError?: 'allow' | 'deny';
};

/**
 * Returns `true` if the caller is still under the limit (and records this
 * hit), `false` if they've exceeded it. Fails open (returns `true`) if the
 * check itself errors, so a rate-limiter outage never blocks legitimate
 * traffic.
 */
export async function checkRateLimit({
  action,
  scope,
  maxHits,
  windowSeconds,
  onError = 'allow',
}: RateLimitOptions): Promise<boolean> {
  // Deliberately the admin client, not whichever client the caller happens
  // to hold. Callers on public paths pass the anon client, and that forced
  // check_rate_limit to stay executable by `anon` — which meant anyone
  // could call it straight from the browser with someone else's key and
  // burn their allowance before they ever arrived. Running it as the
  // service role lets the grant be revoked (see
  // 20260909000002_revoke_server_only_functions.sql) while every existing
  // caller keeps working unchanged.
  const supabase = createAdminClient();
  const ip = await getClientIp();
  const key = scope ? `${action}:${scope}:${ip}` : `${action}:${ip}`;

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds,
  });

  // What to do when the limiter itself is unavailable.
  //
  // Open by default, because the alternative locks real people out of
  // logging in over a database hiccup — a worse outcome than a brief
  // window with no cap. But the paths that spend money or fill storage
  // ask for the opposite: an outage there is exactly when an abuser
  // would get unlimited WhatsApp sends or unlimited uploads on our bill,
  // and a few legitimate people retrying in a minute costs nothing.
  if (error) {
    console.error('[rate-limit] check failed', { action, onError, error });
    return onError === 'allow';
  }
  return data === true;
}
