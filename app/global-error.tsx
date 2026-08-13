'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import './globals.css';

/**
 * Last-resort boundary for errors thrown in the root layout itself — the one
 * case `app/[locale]/error.tsx` can't catch, because at that point the layout
 * (and with it NextIntlClientProvider) never mounted. That's also why the copy
 * here is hardcoded rather than translated: there is no i18n context to read
 * from, so it falls back to the default locale (ar) and its direction.
 *
 * Next.js replaces the whole document with this component, so it has to render
 * its own <html>/<body> and pull in globals.css itself.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-background text-foreground antialiased">
        <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-bold tracking-tight">صار خطأ غير متوقع</h1>
          <p className="text-muted-foreground max-w-md">
            نعتذر — تعذّر تحميل الصفحة. جرّب مرة ثانية، وإذا استمرت المشكلة تواصل معنا.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="bg-primary text-primary-foreground hover:bg-primary/80 mt-2 inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
