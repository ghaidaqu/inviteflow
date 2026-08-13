import type { Metadata } from 'next';
import { fontVariables } from '@/lib/fonts';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      // The public site (homepage, auth, guest/public event pages) uses
      // the light editorial theme in :root. The dashboard app scopes
      // itself into the dark theme separately (see dashboard/layout.tsx)
      // — two distinct, intentional surfaces rather than one global mode.
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider>
          {children}
          {/* Mounted once here rather than per-page, because the guest-facing
              pages (invitation, RSVP, ticket) deliberately have no nav or
              header to put it in — and those are exactly the pages where a
              visitor is most likely to want the other language.

              It used to be `fixed bottom-4 end-4`, which meant it sat on top
              of whatever occupied that corner: on a 390px phone it covered
              ~1900px² of the hero's invitation card, including its CTA. A
              normal element at the end of the column can't overlap anything. */}
          <div className="border-border/60 flex justify-center border-t px-4 py-4">
            <LanguageSwitcher />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
