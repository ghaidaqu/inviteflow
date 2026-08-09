'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { SparklesIcon } from 'lucide-react';

export function SiteNav() {
  const t = useTranslations('HomePage.nav');

  return (
    <header className="sticky top-0 z-40 border-b border-transparent">
      <div className="bg-background/70 border-border/60 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur-lg">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="text-primary flex items-center gap-1.5 text-lg font-bold">
            <SparklesIcon className="size-5" />
            InviteFlow
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium sm:flex">
            <a
              href="#journeys"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('journeysLink')}
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

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
              {t('loginLink')}
            </Button>
            <Button
              size="sm"
              className="shadow-glow"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              {t('startLink')}
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
