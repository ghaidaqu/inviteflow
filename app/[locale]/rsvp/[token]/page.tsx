import { cache } from 'react';
import type { Metadata } from 'next';
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

/** Looked up once per request and shared with the page — cache() dedupes
 *  it, so the status check below costs no extra query. */
const loadRsvp = cache(async (token: string) => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  return getRsvpByToken(supabase, token);
});

/**
 * Here for the status code, not the tags.
 *
 * A bad token used to render the right not-found page and answer HTTP
 * 200 — the shell had already begun streaming by the time the page
 * component called notFound(), so the status was committed. Doing the
 * check in generateMetadata, which runs before rendering starts, makes
 * the 404 real. (Two things previously tried and reverted, so nobody
 * repeats them: `dynamic = 'force-dynamic'` on this route, and a root
 * app/not-found.tsx, which renders its own <html> inside this segment's
 * layout and blanks the page.)
 *
 * The title stays generic on purpose: this URL is a guest's private
 * link, and its title should not name their event or them.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!(await loadRsvp(token))) notFound();
  return { robots: { index: false, follow: false } };
}

export default async function RsvpEditPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const data = await loadRsvp(token);
  if (!data) notFound();

  const supabase = await createClient();

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
