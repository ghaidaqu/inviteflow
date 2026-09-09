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
 * Never cached: a guest's page must reflect the event and their own
 * response as they stand right now.
 *
 * Known, unfixed: a missing slug/token renders the correct not-found page
 * but answers HTTP 200 rather than 404 — a soft 404. notFound() is called
 * correctly; the status is committed before it runs. Neither
 * force-dynamic nor a root app/not-found.tsx fixed it, and the root
 * boundary actively made things worse (it renders its own <html> inside
 * this segment's layout, producing a blank page), so it was reverted.
 * Cosmetic for guests, who see the right page; it costs SEO only, and
 * these are private guest links that should not be indexed anyway.
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
