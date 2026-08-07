'use client';

import { useState, useTransition } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateRsvpAction, type RsvpActionState } from '@/lib/actions/rsvp';
import { Link } from '@/i18n/navigation';
import { Trash2Icon, PlusIcon } from 'lucide-react';
import type { RsvpByToken } from '@/lib/services/rsvp.service';

type EventSettings = {
  allow_attending: boolean;
  allow_not_attending: boolean;
  allow_maybe: boolean;
  collect_companions: boolean;
  max_companions: number;
  collect_message: boolean;
};

type FormValues = {
  status: 'attending' | 'not_attending' | 'maybe';
  companionsNames: { name: string }[];
  message: string;
};

// Edits the invitation accept/decline response only — the RSVP questions
// track lives on its own separate page (/rsvp/[token]/questions), linked
// below rather than folded into this form. See rsvp-form.tsx for the same
// separation on first submission.
export function RsvpEditForm({
  token,
  data,
  settings,
  hasQuestions,
}: {
  token: string;
  data: RsvpByToken;
  settings: EventSettings;
  hasQuestions: boolean;
}) {
  const t = useTranslations('Rsvp');
  const tErrors = useTranslations('Rsvp.errors');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      status: data.response.status,
      companionsNames: data.response.companions_names.map((name) => ({ name })),
      message: data.response.message ?? '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'companionsNames' });

  function onSubmit(values: FormValues) {
    setServerError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set('status', values.status);
    formData.set('message', values.message);
    formData.set('companionsNames', JSON.stringify(values.companionsNames.map((c) => c.name)));
    // Deliberately not setting 'answers' — this form never touches question
    // answers, which live on their own page. See readAnswers() in
    // lib/actions/rsvp.ts for why omitting the field (vs sending `[]`)
    // matters here.

    startTransition(async () => {
      const result: RsvpActionState = await updateRsvpAction(token, {}, formData);
      if (result.error) setServerError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError as 'invalidInput')}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert>
          <AlertDescription>{t('updateSaved')}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="status">{t('statusLabel')}</FieldLabel>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? t(`status.${value}` as 'status.attending') : ''
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {settings.allow_attending && (
                    <SelectItem value="attending">{t('status.attending')}</SelectItem>
                  )}
                  {settings.allow_not_attending && (
                    <SelectItem value="not_attending">{t('status.not_attending')}</SelectItem>
                  )}
                  {settings.allow_maybe && (
                    <SelectItem value="maybe">{t('status.maybe')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {settings.collect_companions && (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <span className="text-sm font-medium">{t('companionsLabel')}</span>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...register(`companionsNames.${index}.name`)}
                  placeholder={t('companionNamePlaceholder')}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            {fields.length < settings.max_companions && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => append({ name: '' })}
              >
                <PlusIcon /> {t('addCompanion')}
              </Button>
            )}
          </div>
        )}

        {settings.collect_message && (
          <Field>
            <FieldLabel htmlFor="message">{t('messageLabel')}</FieldLabel>
            <Textarea id="message" rows={3} {...register('message')} />
          </Field>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t('submitting') : t('saveChanges')}
        </Button>
      </FieldGroup>

      {hasQuestions && (
        <div className="bg-card flex flex-col gap-3 rounded-xl border p-5 text-center">
          <p className="font-medium">{t('questionsFollowUpTitle')}</p>
          <p className="text-muted-foreground text-sm">{t('questionsFollowUpDescription')}</p>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/rsvp/${token}/questions`} />}
          >
            {t('questionsFollowUpButton')}
          </Button>
        </div>
      )}
    </form>
  );
}
