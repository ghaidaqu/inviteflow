import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { listQuestions } from '@/lib/services/questions.service';
import { QuestionsEditor } from '@/components/dashboard/questions-editor';
import { BroadcastResultsButton } from '@/components/dashboard/broadcast-results-button';
import { BulkMessageDialog } from '@/components/dashboard/bulk-message-dialog';
import { Link } from '@/i18n/navigation';

// RSVP settings for an existing event: custom questions plus broadcasting
// results/messages to guests. Used by both creation tracks (Digital
// Invitation and Link Invitation) — the questions/RSVP mechanics are the
// same regardless of which one the event started as.
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('rsvpPageSubtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkMessageDialog eventId={id} />
          <BroadcastResultsButton eventId={id} />
        </div>
      </div>
      <QuestionsEditor eventId={id} initialQuestions={questions} />
    </main>
  );
}
