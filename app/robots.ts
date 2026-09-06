import type { MetadataRoute } from 'next';

// Root-level like sitemap.ts, for the same reason (Next.js only picks up
// robots.ts at app root). Blocks the dashboard, auth, and API routes —
// none of it is content search engines should crawl, and the dashboard/
// auth paths are behind a login anyway.
export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/auth', '/api', '/*/dashboard', '/*/login', '/*/register'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
