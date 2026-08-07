import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PREFIX = '/dashboard';
const AUTH_ONLY_PAGES = ['/login', '/register'];

function stripLocale(pathname: string): string {
  const locale = routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!locale) return pathname;
  const rest = pathname.slice(`/${locale}`.length);
  return rest === '' ? '/' : rest;
}

export default async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { response, user } = await updateSession(request, intlResponse);

  // The intl middleware already issued a redirect (e.g. adding the missing
  // locale prefix) — let that happen first; auth routing runs on the
  // follow-up request once the pathname carries a locale.
  if (intlResponse.headers.get('location')) {
    return response;
  }

  const pathname = stripLocale(request.nextUrl.pathname);
  const locale = request.nextUrl.pathname.split('/')[1] || routing.defaultLocale;

  if (!user && pathname.startsWith(PROTECTED_PREFIX)) {
    // Preserve the page they were headed to (e.g. a specific "create new
    // event" track from the homepage) so login/register can send them
    // straight there instead of dropping them on the generic dashboard.
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Use the locale-prefixed pathname here (not the stripped one above) —
    // safeNextPath() in lib/actions/auth.ts only accepts same-locale,
    // locale-prefixed paths, matching how every other redirect() in the app
    // is built.
    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (user && AUTH_ONLY_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};
