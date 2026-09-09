import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublicEventBySlug } from '@/lib/services/events.service';
import { listQuestions } from '@/lib/services/questions.service';
import { EventPasswordGate } from '@/components/public/event-password-gate';
import { RsvpForm } from '@/components/public/rsvp-form';
import { PublicFormShell } from '@/components/public/public-form-shell';
import { MailIcon } from 'lucide-react';

export default async function EventRsvpPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug: rawSlug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  // See the matching comment in ../page.tsx — a non-ASCII slug arrives
  // here still percent-encoded, so this has to decode it explicitly
  // rather than trust Next.js's usual automatic decoding.
  const slug = decodeURIComponent(rawSlug);
  const result = await getPublicEventBySlug(supabase, slug);
  if (!result) notFound();

  const { event, settings } = result;

  if (event.password_hash) {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get(`event_unlock_${event.id}`)?.value === '1';
    if (!unlocked) return <EventPasswordGate slug={slug} />;
  }

  // Same "is there actually a response to give" check as the event page's
  // RSVP button — a direct/stale link shouldn't reach a status picker with
  // nothing selectable.
  if (!event.is_rsvp_enabled || (!settings.allow_attending && !settings.allow_not_attending)) {
    notFound();
  }

  const t = await getTranslations('Rsvp');

  // submit_rsvp enforces the deadline server-side, but nothing said so
  // until the very last step — a guest could fill in their name, phone,
  // companions, every custom question and the consent box, press send, and
  // only then be told replies had closed. The edit page
  // (app/[locale]/rsvp/[token]/page.tsx) already checked this; the form
  // that people actually arrive at did not.
  const deadlinePassed =
    !!event.rsvp_deadline && new Date(event.rsvp_deadline).getTime() < Date.now();

  if (deadlinePassed) {
    return (
      <PublicFormShell
        icon={<MailIcon className="size-6" />}
        title={event.name}
        subtitle={t('deadlinePassedTitle')}
      >
        <p className="text-muted-foreground text-center">{t('deadlinePassedBody')}</p>
      </PublicFormShell>
    );
  }

  const questions = await listQuestions(supabase, event.id);

  return (
    <PublicFormShell
      icon={<MailIcon className="size-6" />}
      title={event.name}
      subtitle={t('pageSubtitle')}
    >
      <RsvpForm eventSlug={slug} eventName={event.name} settings={settings} questions={questions} />
    </PublicFormShell>
  );
}
