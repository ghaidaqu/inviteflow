'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { getCurrentOrganizationId, hasAnyEvents } from '@/lib/services/events.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import * as Sentry from '@sentry/nextjs';
import {
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
} from '@/lib/validations/auth';

export type AuthActionState = {
  error?: string;
  success?: boolean;
};

const NOT_CONFIGURED: AuthActionState = { error: 'notConfigured' };

// Distinguishes "Supabase's own Auth service is unreachable" from every
// other kind of OTP-request failure. Confirmed live against a real
// Supabase incident (status.supabase.com: "API Gateway — Degraded
// Performance", an open "401 errors due to JWT rejections" issue): every
// request during it threw `AuthRetryableFetchError: fetch failed` with
// `status: 0` — no HTTP response ever came back, as opposed to a normal
// rejected-request error (invalid provider config, bad number, etc.),
// which carries a real status code. Worth telling apart because the fix
// is completely different: "try again in a bit" (a platform outage) vs.
// "something's actually misconfigured" (ours to go debug).
function isProviderOutageError(error: { status?: number; name?: string }): boolean {
  return error.status === 0 || error.name === 'AuthRetryableFetchError';
}

// Only ever redirect to a path we generated ourselves (middleware sets
// `next` to the page the user was headed to before the auth gate). Reject
// anything that isn't a same-site, locale-prefixed path to rule out this
// becoming an open redirect via a crafted `next` value.
function safeNextPath(value: FormDataEntryValue | null, locale: string): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith(`/${locale}/`) && value !== `/${locale}`) return null;
  if (value.startsWith('//') || value.includes('://')) return null;
  return value;
}

// A brand-new account landing on the stats overview just sees zeroes
// everywhere — send it straight to "choose your track" instead, and only
// once an event actually exists does the normal dashboard become the
// default landing spot. Only applies when there's no explicit `next`
// (i.e. the user wasn't on their way to a specific page already).
async function defaultPostAuthPath(
  supabase: SupabaseClient<Database>,
  userId: string,
  locale: string,
): Promise<string> {
  try {
    const organizationId = await getCurrentOrganizationId(supabase, userId);
    const hasEvents = organizationId ? await hasAnyEvents(supabase, organizationId) : false;
    return hasEvents ? `/${locale}/dashboard` : `/${locale}/dashboard/events/new`;
  } catch {
    return `/${locale}/dashboard`;
  }
}

// Logout moved to app/auth/logout/route.ts — a plain POST route handler
// instead of a server action, so it can't go stale across a deploy (see
// that file for why). Keep this file free of a same-named export so no
// one wires the fragile version back in by accident.

// Passwordless auth — phone number over WhatsApp OTP, or an email code
// instead of a password. Both use Supabase's native OTP flow (no custom
// code-storage table needed, so session issuance stays fully inside
// Supabase's own, already-audited auth code instead of anything bespoke).
//
// Phone/WhatsApp specifically needs Twilio (or Twilio Verify) configured
// as the SMS provider in the Supabase dashboard, with WhatsApp selected as
// the channel — Supabase only supports WhatsApp delivery through Twilio.
// Until that's set up, signInWithOtp below will error and the user sees a
// translated message rather than a silent failure.

export async function requestPhoneOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = phoneOtpRequestSchema.safeParse({ phone: formData.get('phone') });
  if (!parsed.success) return { error: 'invalidInput' };

  const supabase = await createClient();

  const allowed = await checkRateLimit(supabase, {
    action: 'phone-otp-request',
    scope: parsed.data.phone,
    maxHits: 3,
    windowSeconds: 600,
  });
  if (!allowed) return { error: 'rateLimited' };

  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
    options: { channel: 'whatsapp' },
  });

  if (error) {
    // The generic translated message is deliberately vague (Supabase's
    // own error text isn't user-facing quality), but that vagueness was
    // hiding real causes from us too — capture the actual error so a
    // provider-config issue (e.g. WhatsApp/Twilio not set up) shows up
    // instead of just "it broke" reports with no lead. Plain
    // console.error alongside Sentry — NEXT_PUBLIC_SENTRY_DSN isn't set
    // in this environment, so Sentry.captureException is a silent no-op
    // right now; `railway logs` is the only place this is actually
    // visible until that's configured.
    console.error('[auth] requestPhoneOtpAction failed', error);
    Sentry.captureException(error, { tags: { action: 'requestPhoneOtpAction' } });
    return { error: isProviderOutageError(error) ? 'authProviderOutage' : 'phoneOtpRequestFailed' };
  }
  return { success: true };
}

export async function verifyPhoneOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = phoneOtpVerifySchema.safeParse({
    phone: formData.get('phone'),
    token: formData.get('token'),
  });
  if (!parsed.success) return { error: 'invalidInput' };

  const locale = await getLocale();
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: 'sms',
  });

  if (error) {
    // Same distinction as the request actions above — a provider outage
    // here would otherwise tell someone who typed the *correct* code
    // that it was wrong, which sends them chasing a typo that isn't
    // there instead of just trying again shortly.
    console.error('[auth] verifyPhoneOtpAction failed', error);
    return { error: isProviderOutageError(error) ? 'authProviderOutage' : 'otpInvalid' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fallback = user
    ? await defaultPostAuthPath(supabase, user.id, locale)
    : `/${locale}/dashboard`;
  redirect(safeNextPath(formData.get('next'), locale) ?? fallback);
}

export async function requestEmailOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = emailOtpRequestSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'invalidInput' };

  const supabase = await createClient();

  const allowed = await checkRateLimit(supabase, {
    action: 'email-otp-request',
    scope: parsed.data.email,
    maxHits: 3,
    windowSeconds: 600,
  });
  if (!allowed) return { error: 'rateLimited' };

  // shouldCreateUser: true — the whole point of passwordless is that a
  // first-time visitor doesn't need a separate "register" step; entering
  // an email and confirming the code that arrives is enough on its own.
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    // Same reasoning as the phone action above — capture the real cause
    // (e.g. Supabase's own email send failing or rate-limiting) instead
    // of only ever seeing the generic translated message.
    console.error('[auth] requestEmailOtpAction failed', error);
    Sentry.captureException(error, { tags: { action: 'requestEmailOtpAction' } });
    return { error: isProviderOutageError(error) ? 'authProviderOutage' : 'emailOtpRequestFailed' };
  }
  return { success: true };
}

export async function verifyEmailOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = emailOtpVerifySchema.safeParse({
    email: formData.get('email'),
    token: formData.get('token'),
  });
  if (!parsed.success) return { error: 'invalidInput' };

  const locale = await getLocale();
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: 'email',
  });

  if (error) {
    console.error('[auth] verifyEmailOtpAction failed', error);
    return { error: isProviderOutageError(error) ? 'authProviderOutage' : 'otpInvalid' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fallback = user
    ? await defaultPostAuthPath(supabase, user.id, locale)
    : `/${locale}/dashboard`;
  redirect(safeNextPath(formData.get('next'), locale) ?? fallback);
}
