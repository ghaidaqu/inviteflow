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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // WhatsApp is where this product actually spreads — organizers paste the
  // link into family group chats — and a link with no Open Graph tags
  // renders there as a bare blue URL. These are what turn that into a card
  // with the name, the line, and the doorway image.
  return {
    metadataBase: new URL(appUrl),
    // A template, so a page that sets its own title gets "Page · مهلّي"
    // and only the homepage uses the brand line on its own. Every route
    // used to inherit this title verbatim, so /privacy, /terms and /try
    // all reported themselves as the homepage to search and to WhatsApp.
    title: { default: t('title'), template: `%s · ${t('siteName')}` },
    description: t('description'),
    alternates: {
      canonical: `${appUrl}/${locale}`,
      languages: { ar: `${appUrl}/ar`, en: `${appUrl}/en`, 'x-default': appUrl },
    },
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      title: t('title'),
      description: t('description'),
      url: `${appUrl}/${locale}`,
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      images: [
        {
          // Absolute and https, with the type spelled out: WhatsApp's
          // crawler is the fussiest of the lot about a preview image, and
          // some versions look for og:image:secure_url specifically.
          url: `${appUrl}/images/marketing/og-card.jpg`,
          secureUrl: `${appUrl}/images/marketing/og-card.jpg`,
          type: 'image/jpeg',
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [`${appUrl}/images/marketing/og-card.jpg`],
    },
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
              pages (invitation, RSVP link) deliberately have no nav or
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
