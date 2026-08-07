import 'server-only';
import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

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
  /** Logical bucket name, e.g. "rsvp" or "tickets". */
  action: string;
  /** Extra identifier to key on in addition to IP (e.g. an event slug). */
  scope?: string;
  maxHits: number;
  windowSeconds: number;
};

/**
 * Returns `true` if the caller is still under the limit (and records this
 * hit), `false` if they've exceeded it. Fails open (returns `true`) if the
 * check itself errors, so a rate-limiter outage never blocks legitimate
 * traffic.
 */
export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  { action, scope, maxHits, windowSeconds }: RateLimitOptions,
): Promise<boolean> {
  const ip = await getClientIp();
  const key = scope ? `${action}:${scope}:${ip}` : `${action}:${ip}`;

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds,
  });

  if (error) return true;
  return data === true;
}
