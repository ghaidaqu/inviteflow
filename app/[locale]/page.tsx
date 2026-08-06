import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations('HomePage');

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
      <p className="text-muted-foreground max-w-md text-lg">{t('subtitle')}</p>
      <div className="flex gap-3">
        <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
          {t('cta')}
        </Button>
        <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
          {t('login')}
        </Button>
      </div>
    </main>
  );
}
