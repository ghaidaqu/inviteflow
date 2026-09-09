import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/marketing/legal-page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Legal.privacy' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return {
    title: t('title'),
    alternates: { canonical: `${appUrl}/${locale}/privacy` },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="privacy" sectionCount={7} />;
}
