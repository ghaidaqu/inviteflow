import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { FinishCreating } from '@/components/public/finish-creating';

const TRACKS = ['invitation', 'rsvp'] as const;
type Track = (typeof TRACKS)[number];

function isTrack(value: string): value is Track {
  return (TRACKS as readonly string[]).includes(value);
}

export default async function QuickStartFinishPage({
  params,
}: {
  params: Promise<{ locale: string; track: string }>;
}) {
  const { locale, track } = await params;
  setRequestLocale(locale);
  if (!isTrack(track)) notFound();

  return <FinishCreating track={track} />;
}
