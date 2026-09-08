import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { listQuestions } from '@/lib/services/questions.service';
import { QuestionsEditor } from '@/components/dashboard/questions-editor';
import { BroadcastResultsButton } from '@/components/dashboard/broadcast-results-button';
import { BulkMessageDialog } from '@/components/dashboard/bulk-message-dialog';
import { Link } from '@/i18n/navigation';

// Broadcasting results and messages to guests, plus — for a Link-track
// event only — its custom questions.
//
// Questions belong to the Link track alone: that track's whole point is a
// registration form the organizer shapes ("how many of you", "which
// night", "any dietary needs"). A Digital Invitation is a personal
// invitation to one named guest with an accept/decline, and putting a
// questionnaire behind it was offering a feature that doesn't fit what
// that track is. Existing answers on any older event are untouched — this
// only stops new questions being authored where they don't belong.
export default async function EventRsvpSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Questions');
  const tDetail = await getTranslations('Events.detail');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  const isLinkTrack = event.track === 'rsvp';
  const questions = isLinkTrack ? await listQuestions(supabase, id) : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">
            {isLinkTrack ? t('title') : tDetail('messagesButton')}
          </h1>
          <p className="text-muted-foreground">
            {isLinkTrack ? t('rsvpPageSubtitle') : t('messagesPageSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkMessageDialog eventId={id} />
          <BroadcastResultsButton eventId={id} />
        </div>
      </div>
      {isLinkTrack && <QuestionsEditor eventId={id} initialQuestions={questions} />}
    </main>
  );
}
