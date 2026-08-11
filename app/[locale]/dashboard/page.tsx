import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId } from '@/lib/services/events.service';
import { getDashboardStats } from '@/lib/services/dashboard.service';
import { RsvpBreakdownChart } from '@/components/dashboard/rsvp-breakdown-chart';
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  UsersIcon,
  CheckCircle2Icon,
  XCircleIcon,
  HelpCircleIcon,
  TicketIcon,
  TicketsIcon,
  WalletIcon,
  QrCodeIcon,
} from 'lucide-react';

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
    {
      label: t('totalEvents'),
      value: stats.totalEvents,
      icon: CalendarIcon,
      tone: 'text-primary bg-primary/10',
    },
    {
      label: t('totalGuests'),
      value: stats.totalGuests,
      icon: UsersIcon,
      tone: 'text-primary bg-primary/10',
    },
    {
      label: t('attending'),
      value: stats.attendingCount,
      icon: CheckCircle2Icon,
      tone: 'text-chart-1 bg-chart-1/10',
      href: '#latest-responses',
    },
    {
      label: t('notAttending'),
      value: stats.notAttendingCount,
      icon: XCircleIcon,
      tone: 'text-destructive bg-destructive/10',
      href: '#latest-responses',
    },
    {
      label: t('noResponse'),
      value: stats.noResponseCount,
      icon: HelpCircleIcon,
      tone: 'text-muted-foreground bg-muted',
      href: '#latest-responses',
    },
    {
      label: t('ticketsSold'),
      value: stats.ticketsSold,
      icon: TicketIcon,
      tone: 'text-accent-foreground bg-accent/25',
    },
    {
      label: t('ticketsRemaining'),
      value: stats.ticketsRemaining,
      icon: TicketsIcon,
      tone: 'text-accent-foreground bg-accent/25',
    },
    {
      label: t('totalRevenue'),
      value: stats.totalRevenue,
      icon: WalletIcon,
      tone: 'text-chart-1 bg-chart-1/10',
    },
    {
      label: t('checkedIn'),
      value: stats.checkedInCount,
      icon: QrCodeIcon,
      tone: 'text-primary bg-primary/10',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>

      <div className="animate-in fade-in slide-in-from-bottom-1 mt-6 grid grid-cols-2 gap-3 duration-300 ease-out sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card) => {
          const CardTag = card.href ? 'a' : 'div';
          return (
            <CardTag
              key={card.label}
              {...(card.href ? { href: card.href } : {})}
              className="bg-card hover:border-primary/30 flex flex-col gap-3 rounded-2xl border p-4 transition-colors"
            >
              <div className={`flex size-9 items-center justify-center rounded-full ${card.tone}`}>
                <card.icon className="size-4.5" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                <div className="text-muted-foreground text-sm">{card.label}</div>
              </div>
            </CardTag>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold tracking-tight">{t('rsvpBreakdown')}</h2>
        <RsvpBreakdownChart
          attending={stats.attendingCount}
          notAttending={stats.notAttendingCount}
          maybe={stats.maybeCount}
          noResponse={stats.noResponseCount}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div id="latest-responses" className="scroll-mt-20">
          <h2 className="mb-3 text-lg font-bold tracking-tight">{t('latestResponses')}</h2>
          {stats.latestResponses.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noData')}</p>
          ) : (
            <ul className="flex max-h-[480px] flex-col gap-2 overflow-y-auto">
              {stats.latestResponses.map((r) => (
                <li
                  key={r.id}
                  className="bg-card hover:border-primary/30 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors"
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
                  className="bg-card hover:border-primary/30 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors"
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
