'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth';
import { resetPasswordAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ResetPasswordForm() {
  const t = useTranslations('Auth.resetPassword');
  const tErrors = useTranslations('Auth.errors');
  const tValidation = useTranslations('Auth.validation');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  function fieldMessage(message?: string) {
    if (!message) return undefined;
    return tValidation(message);
  }

  function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const formData = new FormData();
    formData.set('password', values.password);
    formData.set('confirmPassword', values.confirmPassword);

    startTransition(async () => {
      const result = await resetPasswordAction({}, formData);
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
      </FieldGroup>
    </form>
  );
}
