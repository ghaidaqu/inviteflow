'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { OtpLoginForm } from '@/components/auth/otp-login-form';
import { cn } from '@/lib/utils';

type Mode = 'phone' | 'email';

/**
 * Phone (WhatsApp) is the default tab, email the alternative — no
 * password option at all. Register and log in are the same OTP flow
 * (entering a phone/email and confirming the code creates the account
 * automatically if one doesn't exist), so there was never a real reason
 * to also offer a separate password-based path alongside it — it only
 * added a second, weaker account-recovery surface (forgot/reset
 * password) nothing else in the app pointed to.
 */
export function LoginMethods({ next }: { next?: string }) {
  const t = useTranslations('Auth.otp');
  const [mode, setMode] = useState<Mode>('phone');

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
        {(
          [
            ['phone', t('phoneTab')],
            ['email', t('emailTab')],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
              mode === m
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* key= forces a fresh OtpLoginForm (and its internal step/state)
          when switching between phone and email, instead of carrying
          e.g. a half-entered phone number's state into the email tab. */}
      <OtpLoginForm key={mode} method={mode} next={next} />
    </div>
  );
}
