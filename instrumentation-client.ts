// Client-side error monitoring. Safe with no DSN set — Sentry.init() is a
// no-op in that case, so the app runs identically whether or not this is
// connected. Get a free DSN at https://sentry.io → new project → Next.js.
//
// This replaces the older `sentry.client.config.ts`: from Sentry v9 on, the
// client config belongs in Next.js's own `instrumentation-client` hook, which
// is the only form Turbopack loads. Keeping both files would initialise
// Sentry twice.
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

// Lets Sentry tie a navigation to the transaction it starts, so App Router
// route changes show up as complete traces instead of orphaned spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
