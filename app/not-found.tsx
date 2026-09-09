import Link from 'next/link';

/**
 * Root not-found boundary.
 *
 * app/[locale]/not-found.tsx renders what a visitor actually sees. This
 * exists because the HTTP status is decided at the root: without a
 * boundary here, a notFound() thrown from a route under [locale]
 * rendered the right page but still answered 200 — a soft 404, which
 * search engines index as a real page.
 *
 * Deliberately plain: any request that reaches this one has no locale
 * segment to translate against.
 */
export default function RootNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          background: '#ede2c8',
          color: '#382616',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>الصفحة غير موجودة</h1>
          <p style={{ marginTop: '0.75rem' }}>
            <Link href="/ar" style={{ color: '#96471f' }}>
              العودة إلى مهلّي
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
