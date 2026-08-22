import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { BrandMark } from '@/components/brand-mark';
import { ArrowLeftIcon } from 'lucide-react';

export async function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations('Common');
  const tBrand = await getTranslations('Brand');

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 w-full max-w-md duration-500 ease-out">
        {/* A real button in the normal flow, not a small absolute-positioned
            corner link — that read as decoration and got missed entirely.
            Sits above the wordmark so it's the first thing on the page. */}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/" />}
          className="mb-4"
        >
          <ArrowLeftIcon className="size-4 rtl:-scale-x-100" />
          {t('backToHome')}
        </Button>

        <Link
          href="/"
          className="font-display text-primary mb-6 flex items-center justify-center gap-1.5 text-lg"
        >
          <BrandMark className="size-5" />
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
