import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { GuestCheckInScanner } from '@/components/dashboard/guest-check-in-scanner';
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
    </main>
  );
}
