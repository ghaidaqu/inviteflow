import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getRsvpByToken } from '@/lib/services/rsvp.service';
import { listQuestions } from '@/lib/services/questions.service';
import { RsvpQuestionsForm } from '@/components/public/rsvp-questions-form';
import { Alert, AlertDescription } from '@/components/ui/alert';

// The standalone "RSVP" step — answering the organizer's own questions,
// deliberately separate from /rsvp/[token] (which only edits the
// accept/decline invitation response). See rsvp-questions-form.tsx.
export default async function RsvpQuestionsPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  const data = await getRsvpByToken(supabase, token);
  if (!data) notFound();

  const questions = await listQuestions(supabase, data.event.id);
  const t = await getTranslations('Rsvp');

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{data.event.name}</h1>
      <p className="text-muted-foreground mb-6">{t('rsvpQuestionsPageSubtitle')}</p>

      {questions.length === 0 ? (
        <Alert>
          <AlertDescription>{t('noQuestions')}</AlertDescription>
        </Alert>
      ) : (
        <RsvpQuestionsForm token={token} data={data} questions={questions} />
      )}
    </main>
  );
}
