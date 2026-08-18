import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { QuickStartForm } from '@/components/public/quick-start-form';
import { Link } from '@/i18n/navigation';

const TRACKS = ['invitation', 'rsvp'] as const;
type Track = (typeof TRACKS)[number];

function isTrack(value: string): value is Track {
  return (TRACKS as readonly string[]).includes(value);
}

/**
 * Public "instant start" flow — no login wall. Fill in the event, try one
 * free WhatsApp preview send, then log in only at the very end to
 * activate it (see /start/[track]/finish). Institutional isn't part of
 * this: it needs a company name/logo up front by design, so it keeps
 * going straight to the dashboard's authenticated creation flow.
 */
export default async function QuickStartPage({
  params,
}: {
  params: Promise<{ locale: string; track: string }>;
}) {
  const { locale, track } = await params;
  setRequestLocale(locale);
  if (!isTrack(track)) notFound();

  const t = await getTranslations('Events.newChooser');

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
        <Link href="/" className="text-muted-foreground hover:text-primary text-sm hover:underline">
          {t('title')}
        </Link>

        <div className="animate-in fade-in slide-in-from-bottom-4 mt-2 duration-700">
          <h1 className="text-2xl font-bold tracking-tight">{t(`${track}.title`)}</h1>
          <p className="text-muted-foreground mt-1">{t(`${track}.description`)}</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 bg-card mt-8 rounded-2xl border p-6 delay-150 duration-700">
          <QuickStartForm track={track} />
        </div>
      </div>
    </main>
  );
}
