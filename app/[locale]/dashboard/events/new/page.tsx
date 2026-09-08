import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

const TRACKS = ['invitation', 'rsvp'] as const;

/**
 * The two creation tracks, chosen up front — not checkboxes on one giant
 * form.
 *
 * Both cards go to /start/[track], the same guided wizard the homepage
 * sends people through, rather than the dashboard's own bare EventForm.
 * Having two different creation experiences for the same thing — one for
 * whoever arrived from the homepage, another for whoever clicked "مناسبة
 * جديدة" — was simply a split that shouldn't exist; the wizard is the
 * better of the two and it already handles a signed-in organizer.
 *
 * Institutional is deliberately not here. It's a separate product for
 * companies with its own page and its own enquiry flow, and offering it
 * as a third option to someone creating a personal event only muddied
 * a choice that is really between two things.
 */
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

      <div className="grid gap-4 sm:grid-cols-2">
        {TRACKS.map((track) => (
          <Card key={track}>
            <CardHeader>
              <CardTitle className="text-xl font-bold">{t(`${track}.title`)}</CardTitle>
              <CardDescription>{t(`${track}.description`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                nativeButton={false}
                render={<Link href={`/start/${track}`} />}
              >
                {t('startButton')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
