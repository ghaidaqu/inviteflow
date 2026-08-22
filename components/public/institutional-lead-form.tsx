'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  submitInstitutionalLeadAction,
  type InstitutionalLeadState,
} from '@/lib/actions/institutional-lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { CheckCircle2Icon } from 'lucide-react';

const initialState: InstitutionalLeadState = {};

export function InstitutionalLeadForm() {
  const t = useTranslations('Institutional.form');
  const tErrors = useTranslations('Institutional.form.errors');
  const [state, formAction, isPending] = useActionState(
    submitInstitutionalLeadAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="border-primary/30 bg-primary/5 text-primary flex items-start gap-3 rounded-2xl border p-5">
        <CheckCircle2Icon className="size-5 shrink-0" />
        <p className="text-sm font-medium">{t('success')}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <p className="text-destructive text-sm">{tErrors(state.error)}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="lead-name">{t('nameLabel')}</FieldLabel>
          <Input id="lead-name" name="name" required maxLength={150} />
        </Field>
        <Field>
          <FieldLabel htmlFor="lead-organization">{t('organizationLabel')}</FieldLabel>
          <Input id="lead-organization" name="organization" required maxLength={150} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="lead-email">{t('emailLabel')}</FieldLabel>
          <Input id="lead-email" name="email" type="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="lead-phone">{t('phoneLabel')}</FieldLabel>
          <PhoneInput id="lead-phone" name="phone" />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="lead-message">{t('messageLabel')}</FieldLabel>
        <Textarea id="lead-message" name="message" rows={3} maxLength={1000} />
      </Field>
      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-fit">
        {isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
