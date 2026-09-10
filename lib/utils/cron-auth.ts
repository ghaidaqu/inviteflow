import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Shared gate for the scheduled routes.
 *
 * The two of them had drifted apart: reminders wanted `GET` with
 * `Authorization: Bearer`, broadcast-results wanted `POST` with
 * `x-cron-secret`, and the README documented only the first pair. A
 * scheduler set up from those instructions got a silent 405 on
 * broadcast-results forever — nothing raised, nothing logged, results
 * simply never sent. Verified against production before this existed:
 *
 *   GET  + Authorization  -> 405
 *   POST + Authorization  -> 401
 *   POST + x-cron-secret  -> 200
 *
 * Both spellings are accepted now, on both routes, so a trigger written
 * either way works and neither route can go quietly unreachable again.
 *
 * Header only, never a query parameter: `?secret=` puts the secret into
 * access logs, proxy logs and any Referer. Compared in constant time,
 * because `!==` on a secret leaks its prefix through timing.
 */
export type CronAuth = { ok: true } | { ok: false; reason: 'not_configured' | 'unauthorized' };

export function checkCronAuth(request: NextRequest, routeName: string): CronAuth {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`[cron/${routeName}] CRON_SECRET is not set — rejecting`);
    return { ok: false, reason: 'not_configured' };
  }

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const custom = request.headers.get('x-cron-secret') ?? '';
  const expected = Buffer.from(secret);

  const matches = (provided: string) => {
    const given = Buffer.from(provided);
    return given.length === expected.length && timingSafeEqual(given, expected);
  };

  return matches(bearer) || matches(custom) ? { ok: true } : { ok: false, reason: 'unauthorized' };
}
