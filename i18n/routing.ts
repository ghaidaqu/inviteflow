import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
  // Without this, next-intl auto-picks a locale from the visitor's browser
  // (Accept-Language) the first time they land on a bare, unprefixed URL —
  // so anyone whose browser is set to English got redirected to /en
  // regardless of defaultLocale above, which only applies once no
  // detection signal exists at all. This is an Arabic-first product for
  // an Arabic-first audience; the language switcher is still right there
  // for the (real, but much smaller) English-preferring visitor to use
  // themselves.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
