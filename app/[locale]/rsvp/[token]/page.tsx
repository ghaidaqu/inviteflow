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
 * Noindex, always — valid or not.
 *
 * A guest's RSVP link is private and should never be indexed, and a bad
 * token renders the not-found page under an HTTP 200 that no amount of
 * notFound() placement can change here (the full list of what was tried
 * is in events/[slug]/page.tsx). Marking every response from this route
 * noindex closes both at once.
 */
export async function generateMetadata(): Promise<Metadata> {
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
