// Server-side (Node runtime) error monitoring — catches errors in Server
// Actions, route handlers, and RSC rendering. Safe with no DSN set.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
});
