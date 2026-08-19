import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { NotificationsBell } from '@/components/dashboard/notifications-bell';
import type { Database } from '@/types/supabase';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export async function DashboardHeader({
  userEmail,
  fullName,
  organizationId,
  initialNotifications,
  initialUnreadCount,
}: {
  userEmail: string;
  fullName: string | null;
  organizationId: string | null;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}) {
  const t = await getTranslations('Dashboard');
  const tBrand = await getTranslations('Brand');

  return (
    <header className="bg-background flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-display text-lg">
          {tBrand('name')}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            {t('nav.overview')}
          </Link>
          <Link href="/dashboard/events" className="text-muted-foreground hover:text-foreground">
            {t('nav.events')}
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {organizationId && (
          <NotificationsBell
            organizationId={organizationId}
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
        )}
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {fullName ?? userEmail}
        </span>
        {/* Plain route handler, not a server action — see app/auth/logout/route.ts
            for why: a server action's ID is baked into the page bundle at
            load time and goes stale the moment a new version deploys, so a
            tab left open across a deploy would fail to log out with a raw
            "unexpected error". A URL-addressed route keeps working forever. */}
        <form action="/auth/logout" method="post">
          <Button type="submit" variant="outline" size="sm">
            {t('logout')}
          </Button>
        </form>
      </div>
    </header>
  );
}
