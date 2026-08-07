import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function GuestHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('GuestHub');

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
      <p className="text-muted-foreground mt-2">{t('subtitle')}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('rsvp.title')}</CardTitle>
            <CardDescription>{t('rsvp.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/events/sara-ahmad-wedding" />}
            >
              {t('rsvp.cta')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('tickets.title')}</CardTitle>
            <CardDescription>{t('tickets.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              nativeButton={false}
              render={<Link href="/events/tech-conference-2026" />}
            >
              {t('tickets.cta')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground mt-8 text-sm">{t('note')}</p>
    </main>
  );
}
