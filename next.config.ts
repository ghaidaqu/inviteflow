import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {/* config options here */};

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
