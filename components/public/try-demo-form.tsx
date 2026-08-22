'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { sendTryDemoInvitationAction, type TryDemoState } from '@/lib/actions/try-demo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';

const initialState: TryDemoState = {};

/**
 * Two fields, no login — the whole point is feeling what a guest feels
 * within seconds. Redirects straight to /rsvp/{token}, the guest's own
 * real status page (same one any real invitation's Accept/Decline links
 * to), rather than a bespoke status page just for this flow.
 */
export function TryDemoForm() {
  const t = useTranslations('TryDemo');
  const tErrors = useTranslations('TryDemo.errors');
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (prevState: TryDemoState, formData: FormData) => {
      const result = await sendTryDemoInvitationAction(prevState, formData);
      if (result.token) {
        router.push(`/rsvp/${result.token}`);
      }
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="try-name">{t('nameLabel')}</FieldLabel>
          <Input id="try-name" name="name" autoComplete="name" required />
        </Field>
        <Field data-invalid={state.error === 'phoneInvalid'}>
          <FieldLabel htmlFor="try-phone">{t('phoneLabel')}</FieldLabel>
          <PhoneInput
            id="try-phone"
            name="phone"
            autoComplete="tel"
            required
            aria-invalid={state.error === 'phoneInvalid'}
          />
        </Field>
        {state.error && <p className="text-destructive text-sm">{tErrors(state.error)}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? t('sending') : t('submit')}
        </Button>
      </FieldGroup>
    </form>
  );
}
