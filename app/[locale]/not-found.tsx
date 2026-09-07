import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { NotFoundBackButton } from '@/components/not-found-back-button';

export default async function NotFound() {
  // Next.js doesn't reliably pass dynamic route params to not-found.tsx, so
  // this falls back to the default locale rather than risk a crash reading
  // params that may not be present.
  const locale = routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'NotFound' });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground max-w-md">{t('description')}</p>
      {/* Back (browser history), not straight to the homepage — landing on
          the logged-out marketing page after a bad link mid-dashboard read
          as being signed out, even though the session itself was fine. */}
      <div className="flex items-center gap-2">
        <NotFoundBackButton label={t('goBack')} />
        <Button render={<Link href="/" />} nativeButton={false} variant="outline">
          {t('backHome')}
        </Button>
      </div>
    </main>
  );
}
