import { getTranslations } from 'next-intl/server';
import { logoutAction } from '@/lib/actions/auth';
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

  return (
    <header className="bg-background flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          InviteFlow
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
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            {t('logout')}
          </Button>
        </form>
      </div>
    </header>
  );
}
