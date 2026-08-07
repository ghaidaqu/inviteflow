import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublicEventBySlug } from '@/lib/services/events.service';
import { listQuestions } from '@/lib/services/questions.service';
import { EventPasswordGate } from '@/components/public/event-password-gate';
import { RsvpForm } from '@/components/public/rsvp-form';

export default async function EventRsvpPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  const result = await getPublicEventBySlug(supabase, slug);
  if (!result) notFound();

  const { event, settings } = result;

  if (event.password_hash) {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get(`event_unlock_${event.id}`)?.value === '1';
    if (!unlocked) return <EventPasswordGate slug={slug} />;
  }

  if (!event.is_rsvp_enabled) notFound();

  const questions = await listQuestions(supabase, event.id);
  const t = await getTranslations('Rsvp');

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{event.name}</h1>
      <p className="text-muted-foreground mb-6">{t('pageSubtitle')}</p>
      <RsvpForm eventSlug={slug} eventName={event.name} settings={settings} questions={questions} />
    </main>
  );
}
