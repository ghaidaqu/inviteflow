import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventForm } from '@/components/dashboard/event-form';
import { createEventAction } from '@/lib/actions/events';

export default async function NewEventPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events.list');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t('newButton')}</h1>
      <EventForm action={createEventAction} />
    </main>
  );
}
