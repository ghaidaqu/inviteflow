import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { listQuestions } from '@/lib/services/questions.service';
import { QuestionsEditor } from '@/components/dashboard/questions-editor';
import { Link } from '@/i18n/navigation';

// "RSVP" — a separate track from the invitation itself (see /invitation):
// a poll/questionnaire tool for actually organizing an event or meetup
// around the organizer's own questions, independent of whether guests are
// just "accepting" an invitation.
export default async function EventRsvpSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Questions');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  const questions = await listQuestions(supabase, id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mb-6">{t('rsvpPageSubtitle')}</p>
      <QuestionsEditor eventId={id} initialQuestions={questions} />
    </main>
  );
}
