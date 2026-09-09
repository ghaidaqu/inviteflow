import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getRsvpByToken } from '@/lib/services/rsvp.service';
import { listQuestions } from '@/lib/services/questions.service';
import { RsvpEditForm } from '@/components/public/rsvp-edit-form';
import { PublicFormShell } from '@/components/public/public-form-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MailIcon } from 'lucide-react';

/**
 * Never cached. Both because a guest's page must reflect the event and
 * their own response as they stand right now, and because without this a
 * request for a slug/token that does not exist was answered from a
 * prerendered shell with HTTP 200 — a soft 404, which search engines
 * index as a real page. `notFound()` was being called correctly; the
 * status was set before it ran.
 */
export const dynamic = 'force-dynamic';

export default async function RsvpEditPage({
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

  const { data: settings, error: settingsError } = await supabase
    .from('event_settings')
    .select('*')
    .eq('event_id', data.event.id)
    .single();
  if (settingsError) notFound();

  const questions = await listQuestions(supabase, data.event.id);
  const t = await getTranslations('Rsvp');

  const deadlinePassed = data.event.rsvp_deadline
    ? new Date(data.event.rsvp_deadline) < new Date()
    : false;

  return (
    <PublicFormShell
      icon={<MailIcon className="size-6" />}
      title={data.event.name}
      subtitle={t('editPageSubtitle')}
    >
      {deadlinePassed || !settings.allow_guest_edit ? (
        <Alert variant="destructive">
          <AlertDescription>{t('editingClosed')}</AlertDescription>
        </Alert>
      ) : (
        <RsvpEditForm
          token={token}
          data={data}
          settings={settings}
          hasQuestions={questions.length > 0}
        />
      )}
    </PublicFormShell>
  );
}
