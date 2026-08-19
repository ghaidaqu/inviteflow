'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';

export function SiteNav() {
  const t = useTranslations('HomePage.nav');
  const tInstitutional = useTranslations('Institutional');

  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-sm">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6">
        <Link href="/" className="font-display text-lg">
          InviteFlow
        </Link>

        {/* lg (1024px) hid this on perfectly ordinary desktop windows that
            just aren't maximized — md (768px) still gives real phones
            their own layout below it, but stops hiding these on an
            actual laptop/desktop browser. */}
        <div className="hidden items-center gap-6 text-sm font-medium md:flex">
          <a
            href="#journeys"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('journeysLink')}
          </a>
          <a
            href="#pricing"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('pricingLink')}
          </a>
          <Link
            href="/institutional"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {tInstitutional('nav')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground hidden text-sm font-medium sm:inline"
          >
            {t('loginLink')}
          </Link>
          <Button size="sm" variant="secondary" nativeButton={false} render={<Link href="/try" />}>
            {t('startLink')}
          </Button>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
