'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon } from 'lucide-react';
import { sendTryDemoInvitationAction, type TryDemoState } from '@/lib/actions/try-demo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';

const initialState: TryDemoState = {};

/**
 * Two fields, no login — the whole point is feeling what a guest feels
 * within seconds.
 *
 * On success it stays put and says the invitation is on its way. It used
 * to redirect to /rsvp/{token}, the guest's own Accept/Decline page, but
 * that page is what the WhatsApp message itself opens: throwing it up in
 * the sender's browser answered a question nobody asked and made the
 * trial feel like a form to fill rather than a message to receive.
 */
export function TryDemoForm() {
  const t = useTranslations('TryDemo');
  const tErrors = useTranslations('TryDemo.errors');
  const [state, formAction, isPending] = useActionState(sendTryDemoInvitationAction, initialState);

  if (state.token) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <CheckIcon className="size-5" />
        </span>
        <p className="font-display text-lg">{t('sentTitle')}</p>
        <p className="text-muted-foreground text-sm">{t('sentBody')}</p>
      </div>
    );
  }

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
