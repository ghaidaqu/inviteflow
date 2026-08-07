import { z } from 'zod';

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: 'fullNameTooShort' })
      .max(100, { error: 'fullNameTooLong' }),
    email: z.email({ error: 'emailInvalid' }).trim().toLowerCase(),
    password: z
      .string()
      .min(8, { error: 'passwordTooShort' })
      .max(72, { error: 'passwordTooLong' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'passwordMismatch',
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email({ error: 'emailInvalid' }).trim().toLowerCase(),
  password: z.string().min(1, { error: 'passwordRequired' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email({ error: 'emailInvalid' }).trim().toLowerCase(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: 'passwordTooShort' })
      .max(72, { error: 'passwordTooLong' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'passwordMismatch',
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
