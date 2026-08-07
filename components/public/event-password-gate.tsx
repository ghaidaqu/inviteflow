'use client';

import { useActionState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { verifyEventPasswordAction, type VerifyPasswordState } from '@/lib/actions/public-events';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';

const initialState: VerifyPasswordState = {};

export function EventPasswordGate({ slug }: { slug: string }) {
  const t = useTranslations('PublicEvent.passwordGate');
  const tErrors = useTranslations('PublicEvent.errors');
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (prevState: VerifyPasswordState, formData: FormData) => {
      const result = await verifyEventPasswordAction(slug, prevState, formData);
      if (!result.error) {
        router.refresh();
      }
      return result;
    },
    initialState,
  );

  return (
    <AuthCard title={t('title')} subtitle={t('description')}>
      <form action={formAction}>
        <FieldGroup>
          <Field data-invalid={!!state.error}>
            <FieldLabel htmlFor="password">{t('passwordLabel')}</FieldLabel>
            <Input id="password" name="password" type="password" autoComplete="off" />
            <FieldError>{state.error ? tErrors(state.error) : undefined}</FieldError>
          </Field>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
