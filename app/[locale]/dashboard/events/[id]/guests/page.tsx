import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { listGuestsWithResponses } from '@/lib/services/guests.service';
import {
  getInvitationDeliveriesByGuest,
  deliveryFailureReason,
} from '@/lib/services/whatsapp-delivery.service';
import { GuestsTable } from '@/components/dashboard/guests-table';
import { Link } from '@/i18n/navigation';

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Guests');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  const guests = await listGuestsWithResponses(supabase, id);

  // Whether each invitation actually reached its guest. Flattened to a
  // plain object because a Map can't cross the server/client boundary as
  // a prop, and reduced to the two fields the badge needs rather than
  // shipping whole rows to the browser.
  const deliveryRows = await getInvitationDeliveriesByGuest(supabase, id);
  const deliveries = Object.fromEntries(
    [...deliveryRows].map(([guestId, row]) => [
      guestId,
      {
        status: row.status,
        errorDetail: row.error_detail,
        reason: row.status === 'failed' ? deliveryFailureReason(row.error_code) : null,
      },
    ]),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold tracking-tight">{t('title')}</h1>
      <GuestsTable
        eventId={id}
        eventName={event.name}
        guests={guests}
        deliveries={deliveries}
        isLinkTrack={event.track === 'rsvp'}
        guestLimit={event.guest_limit}
      />
    </main>
  );
}
