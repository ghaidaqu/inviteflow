// Minimal root layout for the /auth segment — required by Next.js for
// any actual *page* under here (route.ts handlers like logout/confirm
// don't need one, but app/auth/seed-demo-org/page.tsx, a real React
// page, does). /auth lives outside app/[locale] on purpose (see that
// page's own comment), so it doesn't inherit app/[locale]/layout.tsx.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
