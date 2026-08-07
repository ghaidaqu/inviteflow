'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { verifyPassword } from '@/lib/utils/password';

export type VerifyPasswordState = {
  error?: string;
};

const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

export async function verifyEventPasswordAction(
  slug: string,
  _prevState: VerifyPasswordState,
  formData: FormData,
): Promise<VerifyPasswordState> {
  const password = formData.get('password');
  if (typeof password !== 'string' || !password) {
    return { error: 'passwordRequired' };
  }

  if (!isSupabaseConfigured()) {
    return { error: 'invalidPassword' };
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('id, password_hash')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !event) {
    return { error: 'invalidPassword' };
  }

  if (!event.password_hash) {
    return {};
  }

  const isValid = await verifyPassword(password, event.password_hash);
  if (!isValid) {
    return { error: 'invalidPassword' };
  }

  const cookieStore = await cookies();
  cookieStore.set(`event_unlock_${event.id}`, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: UNLOCK_COOKIE_MAX_AGE,
    path: '/',
  });

  return {};
}
