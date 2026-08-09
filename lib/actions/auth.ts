'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
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

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = registerSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return { error: 'invalidInput' };
  }

  const locale = await getLocale();
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, preferred_locale: locale },
    },
  });

  if (error) {
    return { error: error.code === 'user_already_exists' ? 'emailAlreadyExists' : 'unknown' };
  }

  redirect(safeNextPath(formData.get('next'), locale) ?? `/${locale}/dashboard`);
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: 'invalidInput' };
  }

  const locale = await getLocale();
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: 'invalidCredentials' };
  }

  redirect(safeNextPath(formData.get('next'), locale) ?? `/${locale}/dashboard`);
}

export async function logoutAction() {
  const locale = await getLocale();

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect(`/${locale}/login`);
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { error: 'invalidInput' };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Always report success even if the email doesn't exist, so this endpoint
  // can't be used to enumerate registered accounts.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/confirm?next=/reset-password`,
  });

  return { success: true };
}

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

  if (error) return { error: 'otpRequestFailed' };
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

  if (error) return { error: 'otpInvalid' };

  redirect(safeNextPath(formData.get('next'), locale) ?? `/${locale}/dashboard`);
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

  if (error) return { error: 'otpRequestFailed' };
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

  if (error) return { error: 'otpInvalid' };

  redirect(safeNextPath(formData.get('next'), locale) ?? `/${locale}/dashboard`);
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return { error: 'invalidInput' };
  }

  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'sessionExpired' };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: 'unknown' };
  }

  redirect(`/${locale}/dashboard`);
}
