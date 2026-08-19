'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { BrandMark } from '@/components/brand-mark';
import { ArrowUpRightIcon } from 'lucide-react';

export function SiteNav() {
  const t = useTranslations('HomePage.nav');
  const tInstitutional = useTranslations('Institutional');
  const tBrand = useTranslations('Brand');

  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-sm">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6">
        <Link href="/" className="font-display flex items-center gap-1.5 text-lg">
          <BrandMark className="size-5" />
          {tBrand('name')}
        </Link>

        {/* "المنتجات"/"الأسعار" (in-page section anchors) removed — the
            homepage no longer needs its own section nav here. المؤسسات
            moved into this action cluster since it no longer has section
            links to sit beside; grouped first, closest to the logo, since
            it's a destination (a different product) rather than an
            action on this page like the two that follow it. */}
        <div className="flex items-center gap-3">
          {/* Deliberately not a plain text link — this leads to what's
              meant to feel like a separate product ("مهلّي أعمال"),
              so it gets its own bordered-pill treatment + opens in a new
              tab, instead of blending in as an action on this site. */}
          <Link
            href="/institutional"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground border-border/60 hover:border-foreground/30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            {tInstitutional('nav')}
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
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
