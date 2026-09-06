import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

// Only the public, non-personalized marketing pages — /dashboard, /rsvp,
// /events/[slug] etc. are either private or per-guest dynamic content that
// search engines have no business indexing (and in the RSVP/event case,
// would just be indexing other people's private invitations). Lives at the
// app root (not under app/[locale]) because Next.js only recognizes
// sitemap.ts at the root — it enumerates both locales itself instead of
// relying on routing.
const PUBLIC_PATHS = ['', '/institutional', '/try', '/privacy', '/terms'];

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return PUBLIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${appUrl}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((altLocale) => [altLocale, `${appUrl}/${altLocale}${path}`]),
        ),
      },
    })),
  );
}
