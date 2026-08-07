import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

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
      <Button render={<Link href="/" />} nativeButton={false}>
        {t('backHome')}
      </Button>
    </main>
  );
}
