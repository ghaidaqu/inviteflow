import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getEventByCheckInToken } from '@/lib/services/check-in.service';
import { PublicCheckInScanner } from '@/components/public/public-check-in-scanner';

/**
 * The door-staff scanner: deliberately outside /dashboard and with no
 * login at all, because the person actually working the door usually
 * isn't the organizer and has no account here. The secret in the URL is
 * the credential (see getEventByCheckInToken) — the organizer shares this
 * link with whoever is on the door and can invalidate it by regenerating
 * the token.
 *
 * Nothing about the event is rendered before the token resolves, and an
 * unknown or revoked token is a plain 404 rather than a "wrong link"
 * message that would confirm which links exist.
 */
export default async function PublicCheckInPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const event = await getEventByCheckInToken(token);
  if (!event) notFound();

  const t = await getTranslations('CheckIn');

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
      <p className="text-muted-foreground mt-1 mb-6">{t('pageSubtitle')}</p>

      <PublicCheckInScanner checkInToken={token} />
    </main>
  );
}
