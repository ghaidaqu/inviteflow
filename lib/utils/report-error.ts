import 'server-only';
import * as Sentry from '@sentry/nextjs';

/**
 * Records why a server action failed.
 *
 * Actions return a generic `{ error: 'unknown' }` to the client on
 * purpose — a user should never see a stack trace, and the message could
 * name internals. But most of them were also discarding the error
 * entirely (`} catch {`), which meant a save that failed in production
 * left no trace anywhere: not in the logs, not in Sentry, nothing to
 * answer "why couldn't this customer add their guests" with.
 *
 * `where` is a stable identifier for the call site, e.g. 'guests.update',
 * so the same failure groups together in Sentry rather than fanning out
 * by message.
 */
export function reportActionError(
  where: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  console.error(`[${where}]`, error, context ?? '');
  Sentry.captureException(error, { tags: { action: where }, extra: context });
}
