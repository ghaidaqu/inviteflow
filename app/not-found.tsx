import Link from 'next/link';

// Root-level fallback for routes that don't even match a locale segment
// (middleware normally redirects these to /ar or /en first). Kept minimal
// and locale-free since next-intl's provider isn't guaranteed to be mounted
// here.
export default function RootNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>الصفحة غير موجودة</h1>
          <Link href="/ar" style={{ textDecoration: 'underline' }}>
            العودة للصفحة الرئيسية
          </Link>
        </main>
      </body>
    </html>
  );
}
