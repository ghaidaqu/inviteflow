import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Three genuinely separate creation tracks, chosen up front — not three
// checkboxes on one giant form. See EventForm's `track` prop and the
// invitation/RSVP dashboard page split for the same principle applied to
// managing an existing event.
//
// Ticketing and RSVP are temporarily locked (product focus is digital
// invitations only for now) — shown but disabled with a "coming soon"
// badge instead of removed, so returning to them later is just deleting
// this flag rather than rebuilding the cards. The route itself is also
// gated (see new/[track]/page.tsx) so a direct URL can't bypass this.
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('invitation.title')}</CardTitle>
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

        <Card className="opacity-70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('event.title')}</CardTitle>
              <Badge variant="secondary">{t('comingSoon')}</Badge>
            </div>
            <CardDescription>{t('event.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" disabled title={t('comingSoonNote')}>
              {t('comingSoon')}
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('rsvp.title')}</CardTitle>
              <Badge variant="secondary">{t('comingSoon')}</Badge>
            </div>
            <CardDescription>{t('rsvp.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" disabled title={t('comingSoonNote')}>
              {t('comingSoon')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
