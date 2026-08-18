'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { GlobeIcon } from 'lucide-react';

/**
 * Icon-only, deliberately — the globe glyph is understood everywhere
 * without a language-specific label sitting next to it (writing "English"
 * only in English, or "العربية" only in Arabic, is itself a small
 * inconsistency the icon avoids entirely). aria-label still carries the
 * real accessible name for screen readers.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Common');

  const otherLocale = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      aria-label={t('languageSwitcher')}
      onClick={() => router.replace(pathname, { locale: otherLocale })}
    >
      <GlobeIcon />
    </Button>
  );
}
