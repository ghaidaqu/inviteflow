import { z } from 'zod';
import { normalizeDigits } from '@/lib/utils/digits';

// Passwordless auth — phone number over WhatsApp OTP, or email OTP code.
// A very loose E.164-ish check (leading +, 8-15 digits) — real validation
// (does this number exist / can it receive WhatsApp) only happens once
// Supabase actually tries to send the code.
export const phoneOtpRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, { error: 'phoneInvalid' })),
});
export type PhoneOtpRequestInput = z.infer<typeof phoneOtpRequestSchema>;

// Must match the "OTP length" set in Supabase's dashboard (Authentication
// → Providers → Email/Phone) — a mismatch there means the code Supabase
// actually sends can never pass this regex. Tried dropping this to 4
// digits for easier typing; Supabase's email OTP length has a hard floor
// of 6, so this stays at 6 for both phone and email.
export const otpCodeSchema = z
  .string()
  .trim()
  .transform(normalizeDigits)
  .pipe(z.string().regex(/^\d{6}$/, { error: 'otpInvalid' }));

export const phoneOtpVerifySchema = z.object({
  phone: phoneOtpRequestSchema.shape.phone,
  token: otpCodeSchema,
});
export type PhoneOtpVerifyInput = z.infer<typeof phoneOtpVerifySchema>;

export const emailOtpRequestSchema = z.object({
  email: z.email({ error: 'emailInvalid' }).trim().toLowerCase(),
});
export type EmailOtpRequestInput = z.infer<typeof emailOtpRequestSchema>;

export const emailOtpVerifySchema = z.object({
  email: emailOtpRequestSchema.shape.email,
  token: otpCodeSchema,
});
export type EmailOtpVerifyInput = z.infer<typeof emailOtpVerifySchema>;
