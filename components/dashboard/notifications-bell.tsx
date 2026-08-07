'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/lib/actions/notifications';
import { BellIcon } from 'lucide-react';
import type { Database } from '@/types/supabase';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

function notificationText(
  n: NotificationRow,
  t: ReturnType<typeof useTranslations<'Notifications'>>,
): string {
  const payload = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'rsvp_new':
      return t('rsvpNew', { name: String(payload.guest_name ?? '') });
    case 'ticket_purchased':
      return t('ticketPurchased', { name: String(payload.buyer_name ?? '') });
    case 'ticket_checked_in':
      return t('ticketCheckedIn', { name: String(payload.holder_name ?? '') });
    default:
      return n.type;
  }
}

export function NotificationsBell({
  organizationId,
  initialNotifications,
  initialUnreadCount,
}: {
  organizationId: string;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}) {
  const t = useTranslations('Notifications');
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationRow;
          setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(prev - 1, 0));
    await markNotificationReadAction(id);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <span className="relative">
          <BellIcon />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -end-2 -top-2 h-4 min-w-4 justify-center px-1 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">{t('title')}</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-muted-foreground hover:text-primary text-xs"
            >
              {t('markAllRead')}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-sm">{t('empty')}</p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={n.is_read ? 'opacity-60' : 'font-medium'}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
            >
              <div className="flex flex-col gap-0.5 py-0.5">
                <span className="text-sm">{notificationText(n, t)}</span>
                <span className="text-muted-foreground text-xs">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
