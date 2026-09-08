import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Three genuinely separate creation tracks, chosen up front — not three
// checkboxes on one giant form. See EventForm's `track` prop and the
// invitation/RSVP dashboard page split for the same principle applied to
// managing an existing event. (Ticketing has been removed from the product
// entirely — it isn't a disabled card here, it's gone.)
export default async function NewEventChooserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events.newChooser');

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mt-1 mb-8">{t('subtitle')}</p>

      {/* Digital Invitation and Link Invitation stacked together in one
          column — the two everyday tracks, ordered by how often they're
          picked. Institutional stands apart in its own column: a
          genuinely different use case (an org, not an individual host),
          not a third option of the same kind as the first two. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">{t('invitation.title')}</CardTitle>
              <CardDescription>{t('invitation.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                nativeButton={false}
                render={<Link href="/dashboard/events/new/invitation" />}
              >
                {t('startButton')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">{t('rsvp.title')}</CardTitle>
              <CardDescription>{t('rsvp.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                nativeButton={false}
                render={<Link href="/dashboard/events/new/rsvp" />}
              >
                {t('startButton')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">{t('institutional.title')}</CardTitle>
            <CardDescription>{t('institutional.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/dashboard/events/new/institutional" />}
            >
              {t('startButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
