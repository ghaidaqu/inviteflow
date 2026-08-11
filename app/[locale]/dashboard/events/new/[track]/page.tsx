import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventForm } from '@/components/dashboard/event-form';
import { createEventAction } from '@/lib/actions/events';

const TRACKS = ['invitation', 'event', 'rsvp'] as const;
type Track = (typeof TRACKS)[number];

function isTrack(value: string): value is Track {
  return (TRACKS as readonly string[]).includes(value);
}

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ locale: string; track: string }>;
}) {
  const { locale, track } = await params;
  setRequestLocale(locale);
  if (!isTrack(track)) notFound();

  // Ticketing and RSVP are locked (see the chooser page) — a direct URL
  // shouldn't be able to reach the create form even though the route
  // itself still technically exists.
  if (track !== 'invitation') notFound();

  const t = await getTranslations('Events.newChooser');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t(`${track}.title`)}</h1>
      <EventForm action={createEventAction} track={track} />
    </main>
  );
}
