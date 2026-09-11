import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/**
 * Sent on every response. The site had none of these, which a browser
 * reads as "no opinion" and falls back to its most permissive behaviour.
 *
 * Not a Content-Security-Policy: this app inlines Next's own hydration
 * scripts and styles, so a correct one needs per-request nonces through
 * the middleware, and a wrong one silently breaks the page for real
 * visitors. That is worth doing properly, not in the same breath as
 * these — which are pure wins with no way to break anything.
 */
const SECURITY_HEADERS = [
  // A year, subdomains included: the domain is https-only and this stops
  // the very first request from being downgradeable.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // An invitation page carries a QR pass and RSVP buttons — framing it
  // inside another site is only ever useful to someone clickjacking a
  // guest into tapping one of them.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Guests upload cover images we serve back; without this a browser may
  // sniff one as HTML and run it.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // A guest's RSVP link is a secret in a URL. Full-path referrers would
  // hand it to every third party an outbound link touches.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nothing here needs any of them, and the door scanner asks for the
  // camera on its own page rather than inheriting a blanket grant.
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(), payment=(), interest-cohort=()',
  },
] as const;

const nextConfig: NextConfig = {
  // Stops announcing the framework and its presence to every scanner.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [...SECURITY_HEADERS] }];
  },
  experimental: {
    serverActions: {
      // Next's own default (1MB) sits under the app's already-documented
      // 5MB image upload limit (see MAX_IMAGE_BYTES in
      // lib/actions/uploads.ts) — a template-generated cover image posted
      // as a Server Action body was hitting Next's ceiling first with a
      // generic 413, well before the app's own size check ever ran.
      // Matching this to that same 5MB (plus headroom for multipart
      // overhead) makes Next's limit stop being the tighter one.
      bodySizeLimit: '8mb',
    },
  },
};

// withSentryConfig only does anything at build time when SENTRY_AUTH_TOKEN
// is set (to upload source maps for readable stack traces) — harmless and
// effectively a no-op otherwise, so this is safe to leave wrapped even
// without a Sentry account connected.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  webpack: { treeshake: { removeDebugLogging: true } },
  telemetry: false,
});
