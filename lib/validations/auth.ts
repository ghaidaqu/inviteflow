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
