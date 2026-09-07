import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId } from '@/lib/services/events.service';
import { getDashboardStats } from '@/lib/services/dashboard.service';
import { RsvpBreakdownChart } from '@/components/dashboard/rsvp-breakdown-chart.lazy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  CalendarIcon,
  UsersIcon,
  CheckCircle2Icon,
  XCircleIcon,
  HelpCircleIcon,
} from 'lucide-react';

const RESPONSE_STATUS_VARIANT = {
  attending: 'default',
  not_attending: 'destructive',
} as const;

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard.overview');
  const tEvents = await getTranslations('Events.list');

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
        noResponseCount: 0,
        latestResponses: [],
      };

  const statCards = [
    {
      label: t('totalEvents'),
      value: stats.totalEvents,
      icon: CalendarIcon,
      tone: 'text-primary bg-primary/10',
      // Wasn't clickable at all before — "how many events" with no way
      // to get from there to any specific one of them was a dead end.
      // The events list is exactly "pick the one you want to see" already,
      // so this just points there instead of building a second picker.
      href: '/dashboard/events',
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
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        {/* This page had no path to creating an event at all — only
            /dashboard/events (one nav click away) did. Landing here first
            after login with no visible way to start a new one was a real
            dead end, not just a missing shortcut. */}
        <Button nativeButton={false} render={<Link href="/dashboard/events/new" />}>
          {tEvents('newButton')}
        </Button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-1 mt-6 grid grid-cols-2 gap-3 duration-300 ease-out sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card) => {
          const className =
            'bg-card hover:border-primary/30 flex flex-col gap-3 rounded-2xl border p-4 transition-colors';
          const content = (
            <>
              <div className={`flex size-9 items-center justify-center rounded-full ${card.tone}`}>
                <card.icon className="size-4.5" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                <div className="text-muted-foreground text-sm">{card.label}</div>
              </div>
            </>
          );

          // A same-page "#latest-responses" jump is a plain anchor; a real
          // route (like the events list) has to go through next-intl's
          // Link so it gets the locale prefix — a raw <a href="/dashboard/…">
          // would drop straight past that.
          if (card.href?.startsWith('#')) {
            return (
              <a key={card.label} href={card.href} className={className}>
                {content}
              </a>
            );
          }
          if (card.href) {
            return (
              <Link key={card.label} href={card.href} className={className}>
                {content}
              </Link>
            );
          }
          return (
            <div key={card.label} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold tracking-tight">{t('rsvpBreakdown')}</h2>
        <RsvpBreakdownChart
          attending={stats.attendingCount}
          notAttending={stats.notAttendingCount}
          noResponse={stats.noResponseCount}
        />
      </div>

      <div id="latest-responses" className="mt-8 scroll-mt-20">
        <h2 className="mb-3 text-lg font-bold tracking-tight">{t('latestResponses')}</h2>
        {stats.latestResponses.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noData')}</p>
        ) : (
          <ul className="grid max-h-[480px] gap-2 overflow-y-auto sm:grid-cols-2">
            {stats.latestResponses.map((r) => (
              <li
                key={r.id}
                className="bg-card hover:border-primary/30 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors"
              >
                <div>
                  <div className="font-medium">{r.guestName || '—'}</div>
                  <div className="text-muted-foreground text-xs">{r.eventName}</div>
                </div>
                <Badge variant={RESPONSE_STATUS_VARIANT[r.status]}>{t(`status.${r.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
