import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId } from '@/lib/services/events.service';
import { getDashboardStats } from '@/lib/services/dashboard.service';
import { RsvpBreakdownChart } from '@/components/dashboard/rsvp-breakdown-chart';
import { Badge } from '@/components/ui/badge';

const RESPONSE_STATUS_VARIANT = {
  attending: 'default',
  not_attending: 'destructive',
  maybe: 'secondary',
} as const;

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard.overview');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organizationId = user ? await getCurrentOrganizationId(supabase, user.id) : null;
  const stats = organizationId
    ? await getDashboardStats(supabase, organizationId)
    : {
        totalEvents: 0,
        totalGuests: 0,
        attendingCount: 0,
        notAttendingCount: 0,
        maybeCount: 0,
        noResponseCount: 0,
        ticketsSold: 0,
        ticketsRemaining: 0,
        totalRevenue: 0,
        checkedInCount: 0,
        latestResponses: [],
        latestCheckIns: [],
      };

  const statCards = [
    { label: t('totalEvents'), value: stats.totalEvents },
    { label: t('totalGuests'), value: stats.totalGuests },
    { label: t('attending'), value: stats.attendingCount },
    { label: t('notAttending'), value: stats.notAttendingCount },
    { label: t('noResponse'), value: stats.noResponseCount },
    { label: t('ticketsSold'), value: stats.ticketsSold },
    { label: t('ticketsRemaining'), value: stats.ticketsRemaining },
    { label: t('totalRevenue'), value: stats.totalRevenue },
    { label: t('checkedIn'), value: stats.checkedInCount },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-muted-foreground text-sm">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold tracking-tight">{t('rsvpBreakdown')}</h2>
        <RsvpBreakdownChart
          attending={stats.attendingCount}
          notAttending={stats.notAttendingCount}
          maybe={stats.maybeCount}
          noResponse={stats.noResponseCount}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold tracking-tight">{t('latestResponses')}</h2>
          {stats.latestResponses.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noData')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.latestResponses.map((r) => (
                <li
                  key={r.id}
                  className="bg-card flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{r.guestName || '—'}</div>
                    <div className="text-muted-foreground text-xs">{r.eventName}</div>
                  </div>
                  <Badge variant={RESPONSE_STATUS_VARIANT[r.status]}>
                    {t(`status.${r.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold tracking-tight">{t('latestCheckIns')}</h2>
          {stats.latestCheckIns.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noData')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.latestCheckIns.map((c) => (
                <li
                  key={c.id}
                  className="bg-card flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{c.holderName}</div>
                    <div className="text-muted-foreground text-xs">{c.eventName}</div>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(c.checkedInAt).toLocaleString(locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
