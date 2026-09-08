'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * The auth-dependent half of SiteNav, split out as a client component on
 * purpose: an organizer who's already signed in and lands back on the
 * marketing pages used to see "تسجيل الدخول / جرب مجاناً" and reasonably
 * conclude they'd been logged out (their session was fine the whole time
 * — this nav just never asked).
 *
 * Checking the session on the server would have been simpler, but reading
 * cookies opts the whole marketing page out of static rendering, and
 * these pages are the ones that most need to stay fast. So the signed-out
 * links render immediately as the static default — right for almost every
 * visitor — and only correct themselves for the signed-in minority once
 * the browser has read its own session.
 */
export function SiteNavActions() {
  const t = useTranslations('HomePage.nav');
  const tDashboard = useTranslations('Dashboard.nav');
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setIsSignedIn(!!data.user);
      })
      .catch(() => {
        // Signed-out is the safe default — never block the nav on this.
      });
    return () => {
      active = false;
    };
  }, []);

  if (isSignedIn) {
    return (
      <Button size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
        {tDashboard('overview')}
      </Button>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground text-sm font-medium"
      >
        {t('loginLink')}
      </Link>
      <Button size="sm" nativeButton={false} render={<Link href="/try" />}>
        {t('startLink')}
      </Button>
    </>
  );
}
