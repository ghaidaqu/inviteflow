import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getRsvpByToken } from '@/lib/services/rsvp.service';
import { listQuestions } from '@/lib/services/questions.service';
import { RsvpQuestionsForm } from '@/components/public/rsvp-questions-form';
import { PublicFormShell } from '@/components/public/public-form-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircleIcon } from 'lucide-react';

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
    <PublicFormShell
      icon={<MessageCircleIcon className="size-6" />}
      title={data.event.name}
      subtitle={t('rsvpQuestionsPageSubtitle')}
    >
      {questions.length === 0 ? (
        <Alert>
          <AlertDescription>{t('noQuestions')}</AlertDescription>
        </Alert>
      ) : (
        <RsvpQuestionsForm token={token} data={data} questions={questions} />
      )}
    </PublicFormShell>
  );
}
