import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { listTicketsForEvent } from '@/lib/services/tickets.service';
import { QrScanner } from '@/components/dashboard/qr-scanner';
import { LiveCheckInStats } from '@/components/dashboard/live-checkin-stats';
import { Link } from '@/i18n/navigation';

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

  const tickets = await listTicketsForEvent(supabase, id);
  const usedCount = tickets.filter((tk) => tk.status === 'used').length;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold tracking-tight">{t('title')}</h1>

      <div className="mb-6">
        <LiveCheckInStats eventId={id} initialTotal={tickets.length} initialUsed={usedCount} />
      </div>

      <QrScanner />
    </main>
  );
}
