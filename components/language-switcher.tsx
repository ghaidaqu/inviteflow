'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { GlobeIcon } from 'lucide-react';

const LOCALE_LABEL: Record<string, string> = {
  ar: 'العربية',
  en: 'English',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Common');

  const otherLocale = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={t('languageSwitcher')}
      onClick={() => router.replace(pathname, { locale: otherLocale })}
    >
      <GlobeIcon />
      {LOCALE_LABEL[otherLocale]}
    </Button>
  );
}
