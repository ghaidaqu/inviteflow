'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { OtpLoginForm } from '@/components/auth/otp-login-form';
import { LoginForm } from '@/components/auth/login-form';
import { cn } from '@/lib/utils';

type Mode = 'phone' | 'email' | 'password';

/**
 * Phone (WhatsApp) is the default tab — the explicit ask was "easy login,
 * just a phone number", with password-based email as the fallback for
 * anyone who wants it, not the other way around.
 */
export function LoginMethods({ next }: { next?: string }) {
  const t = useTranslations('Auth.otp');
  const [mode, setMode] = useState<Mode>('phone');

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-muted grid grid-cols-3 gap-1 rounded-lg p-1">
        {(
          [
            ['phone', t('phoneTab')],
            ['email', t('emailTab')],
            ['password', t('passwordTab')],
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

      {mode === 'password' ? (
        <LoginForm next={next} />
      ) : (
        // key= forces a fresh OtpLoginForm (and its internal step/state)
        // when switching between phone and email, instead of carrying
        // e.g. a half-entered phone number's state into the email tab.
        <OtpLoginForm key={mode} method={mode} next={next} />
      )}
    </div>
  );
}
