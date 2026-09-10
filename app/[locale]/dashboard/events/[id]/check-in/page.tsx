import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { getCheckInToken } from '@/lib/services/event-secrets.service';
import { GuestCheckInScanner } from '@/components/dashboard/guest-check-in-scanner';
import { StaffLinkPanel } from '@/components/dashboard/staff-link-panel';
import { Link } from '@/i18n/navigation';

// The door-scanning tool for an event with entry QR enabled — an
// organizer (or whoever they hand their phone to at the door) opens this
// on-site and scans each guest's own entry-QR pass to mark it used. See
// components/dashboard/guest-check-in-scanner.tsx for how the actual
// camera/decode loop works; this page is just the auth/ownership check
// and the surrounding chrome.
export default async function EventCheckInPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('CheckIn');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const staffLinkBase = `${appUrl}/${locale}/check-in/`;
  // Read with the service role: event_secrets denies every client role.
  // Ownership was established by getEvent above.
  const staffLink = `${staffLinkBase}${await getCheckInToken(event.id)}`;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
      <p className="text-muted-foreground mb-6">{t('pageSubtitle')}</p>

      <GuestCheckInScanner eventId={id} />

      {/* The door is usually worked by someone who isn't the organizer and
          has no account here, so the scanner has to be shareable — this
          link opens the same scanner with no login (see
          app/[locale]/check-in/[token]). It's a real credential: anyone
          holding it can mark guests arrived, so it's shown here only, not
          alongside the ordinary public invitation link. */}
      <StaffLinkPanel eventId={id} initialLink={staffLink} linkBase={staffLinkBase} />
    </main>
  );
}
