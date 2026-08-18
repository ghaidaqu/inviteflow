'use client';

import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  eventSettingsFormSchema,
  type EventSettingsFormInput,
  type EventSettingsFormOutput,
} from '@/lib/validations/event-settings';
import { updateEventSettingsAction } from '@/lib/actions/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription, FieldGroup } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Database } from '@/types/supabase';

type EventSettingsRow = Database['public']['Tables']['event_settings']['Row'];

export function EventSettingsForm({
  eventId,
  settings,
}: {
  eventId: string;
  settings: EventSettingsRow;
}) {
  const t = useTranslations('EventSettings');
  const tErrors = useTranslations('EventSettings.errors');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<EventSettingsFormInput, unknown, EventSettingsFormOutput>({
    resolver: zodResolver(eventSettingsFormSchema),
    defaultValues: {
      allowAttending: settings.allow_attending,
      allowNotAttending: settings.allow_not_attending,
      allowMaybe: settings.allow_maybe,
      collectCompanions: settings.collect_companions,
      maxCompanions: settings.max_companions,
      collectMessage: settings.collect_message,
      allowGuestEdit: settings.allow_guest_edit,
    },
  });

  const collectCompanions = watch('collectCompanions');

  function onSubmit(values: EventSettingsFormOutput) {
    setServerError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set('allowAttending', String(values.allowAttending));
    formData.set('allowNotAttending', String(values.allowNotAttending));
    formData.set('allowMaybe', String(values.allowMaybe));
    formData.set('collectCompanions', String(values.collectCompanions));
    formData.set('maxCompanions', String(values.maxCompanions));
    formData.set('collectMessage', String(values.collectMessage));
    formData.set('allowGuestEdit', String(values.allowGuestEdit));

    startTransition(async () => {
      const result = await updateEventSettingsAction(eventId, {}, formData);
      if (result.error) setServerError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError)}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert>
          <AlertDescription>{t('saved')}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        {errors.allowAttending && (
          <Alert variant="destructive">
            <AlertDescription>{tErrors('atLeastOneStatus')}</AlertDescription>
          </Alert>
        )}

        <Field orientation="horizontal">
          <FieldLabel htmlFor="allowAttending" className="flex-1 font-normal">
            {t('allowAttendingLabel')}
          </FieldLabel>
          <Controller
            control={control}
            name="allowAttending"
            render={({ field }) => (
              <Switch id="allowAttending" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="allowNotAttending" className="flex-1 font-normal">
            {t('allowNotAttendingLabel')}
            <FieldDescription>{t('allowNotAttendingHint')}</FieldDescription>
          </FieldLabel>
          <Controller
            control={control}
            name="allowNotAttending"
            render={({ field }) => (
              <Switch
                id="allowNotAttending"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="allowMaybe" className="flex-1 font-normal">
            {t('allowMaybeLabel')}
            <FieldDescription>{t('allowMaybeHint')}</FieldDescription>
          </FieldLabel>
          <Controller
            control={control}
            name="allowMaybe"
            render={({ field }) => (
              <Switch id="allowMaybe" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="collectCompanions" className="flex-1 font-normal">
            {t('collectCompanionsLabel')}
            <FieldDescription>{t('collectCompanionsHint')}</FieldDescription>
          </FieldLabel>
          <Controller
            control={control}
            name="collectCompanions"
            render={({ field }) => (
              <Switch
                id="collectCompanions"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        {collectCompanions && (
          <Field>
            <FieldLabel htmlFor="maxCompanions">{t('maxCompanionsLabel')}</FieldLabel>
            <Input
              id="maxCompanions"
              type="number"
              min={0}
              max={50}
              {...register('maxCompanions')}
            />
          </Field>
        )}

        <Field orientation="horizontal">
          <FieldLabel htmlFor="collectMessage" className="flex-1 font-normal">
            {t('collectMessageLabel')}
          </FieldLabel>
          <Controller
            control={control}
            name="collectMessage"
            render={({ field }) => (
              <Switch id="collectMessage" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="allowGuestEdit" className="flex-1 font-normal">
            {t('allowGuestEditLabel')}
            <FieldDescription>{t('allowGuestEditHint')}</FieldDescription>
          </FieldLabel>
          <Controller
            control={control}
            name="allowGuestEdit"
            render={({ field }) => (
              <Switch id="allowGuestEdit" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? t('saving') : t('saveButton')}
        </Button>
      </FieldGroup>
    </form>
  );
}
