'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
} from '@/lib/validations/auth';
import {
  requestPhoneOtpAction,
  verifyPhoneOtpAction,
  requestEmailOtpAction,
  verifyEmailOtpAction,
} from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Field, FieldLabel, FieldDescription, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Method = 'phone' | 'email';
type Step = 'request' | 'verify';

/**
 * Passwordless sign-in: a phone number verified over WhatsApp, or an email
 * verified with a 6-digit code — no password either way. Both use
 * Supabase's own signInWithOtp/verifyOtp (see lib/actions/auth.ts), so
 * session issuance stays inside Supabase's audited auth code rather than
 * anything bespoke here.
 *
 * Phone/WhatsApp specifically only works once Twilio (with WhatsApp as the
 * channel) is configured as the SMS provider in the Supabase dashboard —
 * until then, requesting a code surfaces a translated error pointing at
 * the email tab instead of failing silently.
 */
export function OtpLoginForm({ method, next }: { method: Method; next?: string }) {
  const t = useTranslations('Auth.otp');
  const tErrors = useTranslations('Auth.errors');
  const tValidation = useTranslations('Auth.validation');
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>('request');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  function requestCode() {
    setFieldError(null);
    setServerError(null);

    const schema = method === 'phone' ? phoneOtpRequestSchema : emailOtpRequestSchema;
    const value = method === 'phone' ? phone.trim() : email.trim();
    const parsed = schema.safeParse(method === 'phone' ? { phone: value } : { email: value });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'invalidInput');
      return;
    }

    const formData = new FormData();
    if (method === 'phone') formData.set('phone', value);
    else formData.set('email', value);

    startTransition(async () => {
      const action = method === 'phone' ? requestPhoneOtpAction : requestEmailOtpAction;
      const result = await action({}, formData);
      if (result?.error) setServerError(result.error);
      else setStep('verify');
    });
  }

  function verifyCode() {
    setFieldError(null);
    setServerError(null);

    const schema = method === 'phone' ? phoneOtpVerifySchema : emailOtpVerifySchema;
    const parsed = schema.safeParse(
      method === 'phone'
        ? { phone: phone.trim(), token: code.trim() }
        : { email: email.trim(), token: code.trim() },
    );
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'invalidInput');
      return;
    }

    const formData = new FormData();
    if (method === 'phone') formData.set('phone', phone.trim());
    else formData.set('email', email.trim());
    formData.set('token', code.trim());
    if (next) formData.set('next', next);

    startTransition(async () => {
      const action = method === 'phone' ? verifyPhoneOtpAction : verifyEmailOtpAction;
      const result = await action({}, formData);
      if (result?.error) setServerError(result.error);
    });
  }

  const identifier = method === 'phone' ? phone : email;

  return (
    <FieldGroup>
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError)}</AlertDescription>
        </Alert>
      )}

      {step === 'request' ? (
        <>
          {method === 'phone' ? (
            <Field data-invalid={!!fieldError}>
              <FieldLabel htmlFor="otp-phone">{t('phoneLabel')}</FieldLabel>
              <PhoneInput
                id="otp-phone"
                aria-invalid={!!fieldError}
                value={phone}
                onChange={setPhone}
              />
              <FieldDescription>
                {fieldError ? tValidation(fieldError) : t('phoneHint')}
              </FieldDescription>
            </Field>
          ) : (
            <Field data-invalid={!!fieldError}>
              <FieldLabel htmlFor="otp-email">{t('emailLabel')}</FieldLabel>
              <Input
                id="otp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldError && <FieldDescription>{tValidation(fieldError)}</FieldDescription>}
            </Field>
          )}

          <Button type="button" disabled={isPending} className="w-full" onClick={requestCode}>
            {isPending
              ? t('sending')
              : method === 'phone'
                ? t('sendPhoneCode')
                : t('sendEmailCode')}
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {method === 'phone'
              ? t('codeSentToPhone', { phone: identifier })
              : t('codeSentToEmail', { email: identifier })}
          </p>

          <Field data-invalid={!!fieldError}>
            <FieldLabel htmlFor="otp-code">{t('codeLabel')}</FieldLabel>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              dir="ltr"
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {fieldError && <FieldDescription>{tValidation(fieldError)}</FieldDescription>}
          </Field>

          <Button type="button" disabled={isPending} className="w-full" onClick={verifyCode}>
            {isPending ? t('verifying') : t('verify')}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setStep('request');
                setCode('');
                setFieldError(null);
                setServerError(null);
              }}
            >
              {method === 'phone' ? t('changeNumber') : t('changeEmail')}
            </button>
            <button
              type="button"
              disabled={isPending}
              className="text-primary font-medium underline-offset-4 hover:underline disabled:opacity-50"
              onClick={requestCode}
            >
              {t('resendCode')}
            </button>
          </div>
        </>
      )}
    </FieldGroup>
  );
}
