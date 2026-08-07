import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { listTicketTypes, listTicketsForEvent } from '@/lib/services/tickets.service';
import { TicketTypesManager } from '@/components/dashboard/ticket-types-manager';
import { TicketsList } from '@/components/dashboard/tickets-list';
import { Link } from '@/i18n/navigation';

export default async function EventTicketsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Tickets');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  const [ticketTypes, tickets] = await Promise.all([
    listTicketTypes(supabase, id),
    listTicketsForEvent(supabase, id),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold tracking-tight">{t('title')}</h1>

      <TicketTypesManager eventId={id} ticketTypes={ticketTypes} />

      <h2 className="mt-10 mb-4 text-xl font-bold tracking-tight">{t('list.title')}</h2>
      <TicketsList eventName={event.name} tickets={tickets} />
    </main>
  );
}
