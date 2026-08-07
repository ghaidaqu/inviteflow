'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { registerAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations('Auth.register');
  const tErrors = useTranslations('Auth.errors');
  const tValidation = useTranslations('Auth.validation');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  function fieldMessage(message?: string) {
    if (!message) return undefined;
    return tValidation(message);
  }

  function onSubmit(values: RegisterInput) {
    setServerError(null);
    const formData = new FormData();
    formData.set('fullName', values.fullName);
    formData.set('email', values.email);
    formData.set('password', values.password);
    formData.set('confirmPassword', values.confirmPassword);
    if (next) formData.set('next', next);

    startTransition(async () => {
      const result = await registerAction({}, formData);
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

        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="fullName">{t('fullNameLabel')}</FieldLabel>
          <Input id="fullName" autoComplete="name" {...register('fullName')} />
          <FieldError>{fieldMessage(errors.fullName?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t('emailLabel')}</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{fieldMessage(errors.email?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">{t('passwordLabel')}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          <FieldError>{fieldMessage(errors.password?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">{t('confirmPasswordLabel')}</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          <FieldError>{fieldMessage(errors.confirmPassword?.message)}</FieldError>
        </Field>

        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {isPending ? t('submitting') : t('submit')}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          {t('haveAccount')}{' '}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            {t('loginLink')}
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
