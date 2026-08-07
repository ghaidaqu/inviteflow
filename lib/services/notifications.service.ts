import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;
type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export async function listNotifications(
  supabase: Client,
  organizationId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getUnreadCount(supabase: Client, organizationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_read', false);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: Client,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllNotificationsRead(
  supabase: Client,
  organizationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('organization_id', organizationId)
    .eq('is_read', false);

  if (error) throw error;
}
