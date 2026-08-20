import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
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
