import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId } from '@/lib/services/events.service';
import { listNotifications, getUnreadCount } from '@/lib/services/notifications.service';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const [notifications, unreadCount] = organizationId
    ? await Promise.all([
        listNotifications(supabase, organizationId),
        getUnreadCount(supabase, organizationId),
      ])
    : [[], 0];

  return (
    <div className="flex min-h-full flex-col">
      <DashboardHeader
        userEmail={user.email ?? ''}
        fullName={profile?.full_name ?? null}
        organizationId={organizationId}
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
      <div className="bg-muted/30 flex-1">{children}</div>
    </div>
  );
}
