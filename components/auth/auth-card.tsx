import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { SparklesIcon, ArrowLeftIcon } from 'lucide-react';

export async function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations('Auth');
  const tBrand = await getTranslations('Brand');

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-12">
      {/* An explicit, unmissable way back — not just the wordmark below,
          which reads as a logo first and a link second. Fixed to the
          viewport corner so it's reachable without scrolling on a long
          phone screen too. */}
      <Link
        href="/"
        className="text-muted-foreground hover:text-primary absolute start-4 top-4 flex items-center gap-1.5 text-sm font-medium rtl:flex-row-reverse"
      >
        <ArrowLeftIcon className="size-4 rtl:-scale-x-100" />
        {t('backToHome')}
      </Link>

      <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 w-full max-w-md duration-500 ease-out">
        <Link
          href="/"
          className="font-display text-primary mb-6 flex items-center justify-center gap-1.5 text-lg"
        >
          <SparklesIcon className="size-5" />
          {tBrand('name')}
        </Link>

        <Card className="border-border/60 bg-card/90 shadow-primary/5 w-full shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-display text-2xl">{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
