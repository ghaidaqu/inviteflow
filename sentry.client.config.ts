// Client-side error monitoring. Safe with no DSN set — Sentry.init() is a
// no-op in that case, so the app runs identically whether or not this is
// connected. Get a free DSN at https://sentry.io → new project → Next.js.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
  // Session Replay is off by default — it captures DOM/user interaction and
  // is worth turning on deliberately once you've reviewed the privacy
  // implications for RSVP/buyer PII, not by default.
});
