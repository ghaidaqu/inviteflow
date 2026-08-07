'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';
import { forgotPasswordAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';

export function ForgotPasswordForm() {
  const t = useTranslations('Auth.forgotPassword');
  const tValidation = useTranslations('Auth.validation');
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  function fieldMessage(message?: string) {
    if (!message) return undefined;
    return tValidation(message);
  }

  function onSubmit(values: ForgotPasswordInput) {
    const formData = new FormData();
    formData.set('email', values.email);

    startTransition(async () => {
      await forgotPasswordAction({}, formData);
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>{t('successMessage')}</AlertDescription>
        </Alert>
        <Link
          href="/login"
          className="text-primary text-center text-sm font-medium underline-offset-4 hover:underline"
        >
          {t('backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t('emailLabel')}</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{fieldMessage(errors.email?.message)}</FieldError>
        </Field>

        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {isPending ? t('submitting') : t('submit')}
        </Button>

        <Link
          href="/login"
          className="text-muted-foreground hover:text-primary text-center text-sm underline-offset-4 hover:underline"
        >
          {t('backToLogin')}
        </Link>
      </FieldGroup>
    </form>
  );
}
