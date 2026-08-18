import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PublicFormShell } from '@/components/public/public-form-shell';
import { TryDemoForm } from '@/components/public/try-demo-form';
import { SendIcon } from 'lucide-react';

/**
 * The public, no-login "try it free" flow — nav/hero/pricing all point
 * here. Distinct from /start/invitation, which builds and trial-sends
 * *your own* event after logging in — this sends a fixed sample
 * invitation on WhatsApp right now, no account needed, so someone can
 * feel what a guest feels before deciding anything.
 */
export default async function TryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('TryDemo');

  return (
    <PublicFormShell
      icon={<SendIcon className="size-6" />}
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <TryDemoForm />
    </PublicFormShell>
  );
}
