import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, listEvents } from '@/lib/services/events.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

const STATUS_VARIANT = {
  draft: 'secondary',
  published: 'default',
  ended: 'outline',
} as const;

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organizationId = user ? await getCurrentOrganizationId(supabase, user.id) : null;
  const events = organizationId ? await listEvents(supabase, organizationId) : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('list.title')}</h1>
        <Button nativeButton={false} render={<Link href="/dashboard/events/new" />}>
          {t('list.newButton')}
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-center">{t('list.empty')}</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{event.name}</h2>
                <Badge variant={STATUS_VARIANT[event.status]}>
                  {t(`statuses.${event.status}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {t(`types.${event.type}`)}
                {event.event_date && (
                  <> · {new Date(event.event_date).toLocaleDateString(locale)}</>
                )}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto w-fit"
                nativeButton={false}
                render={<Link href={`/dashboard/events/${event.id}`} />}
              >
                {t('list.viewButton')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
