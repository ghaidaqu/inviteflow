'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function SiteNav() {
  const t = useTranslations('HomePage.nav');

  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-sm">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          InviteFlow
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium lg:flex">
          <a
            href="#journeys"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('journeysLink')}
          </a>
          <a
            href="#templates"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('templatesLink')}
          </a>
          <a
            href="#how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('howItWorksLink')}
          </a>
          <a
            href="#pricing"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('pricingLink')}
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground hidden text-sm font-medium sm:inline"
          >
            {t('loginLink')}
          </Link>
          <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
            {t('startLink')}
          </Button>
        </div>
      </nav>
    </header>
  );
}
