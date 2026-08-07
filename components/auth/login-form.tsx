'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { loginAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('Auth.login');
  const tErrors = useTranslations('Auth.errors');
  const tValidation = useTranslations('Auth.validation');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function fieldMessage(message?: string) {
    if (!message) return undefined;
    return tValidation(message);
  }

  function onSubmit(values: LoginInput) {
    setServerError(null);
    const formData = new FormData();
    formData.set('email', values.email);
    formData.set('password', values.password);
    if (next) formData.set('next', next);

    startTransition(async () => {
      const result = await loginAction({}, formData);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{tErrors(serverError)}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t('emailLabel')}</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{fieldMessage(errors.email?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">{t('passwordLabel')}</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary text-sm underline-offset-4 hover:underline"
            >
              {t('forgotPasswordLink')}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          <FieldError>{fieldMessage(errors.password?.message)}</FieldError>
        </Field>

        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {isPending ? t('submitting') : t('submit')}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          {t('noAccount')}{' '}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            {t('registerLink')}
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
