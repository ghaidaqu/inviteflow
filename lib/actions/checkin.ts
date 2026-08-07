'use server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export type CheckInActionResult =
  | { result: 'valid' | 'already_used' | 'cancelled' | 'not_found'; holderName?: string }
  | { error: string };

export async function checkInTicketAction(qrToken: string): Promise<CheckInActionResult> {
  if (!isSupabaseConfigured()) return { error: 'notConfigured' };
  if (!qrToken) return { error: 'invalidToken' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  try {
    const { data, error } = await supabase.rpc('check_in_ticket', { p_qr_token: qrToken });
    if (error) throw error;

    const parsed = data as unknown as { result: string; holder_name?: string };
    return {
      result: parsed.result as 'valid' | 'already_used' | 'cancelled' | 'not_found',
      holderName: parsed.holder_name,
    };
  } catch {
    return { error: 'checkInFailed' };
  }
}
