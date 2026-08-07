'use client';

import { useState, useTransition } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
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
import { Trash2Icon, PlusIcon } from 'lucide-react';
import type { QuestionWithOptions } from '@/lib/services/questions.service';
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
  answers: Record<string, string | boolean>;
};

export function RsvpEditForm({
  token,
  data,
  settings,
  questions,
}: {
  token: string;
  data: RsvpByToken;
  settings: EventSettings;
  questions: QuestionWithOptions[];
}) {
  const t = useTranslations('Rsvp');
  const tErrors = useTranslations('Rsvp.errors');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const existingAnswers = Object.fromEntries(
    data.answers.map((a) => [a.question_id, a.answer_value as string | boolean]),
  );

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      status: data.response.status,
      companionsNames: data.response.companions_names.map((name) => ({ name })),
      message: data.response.message ?? '',
      answers: existingAnswers,
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
    formData.set(
      'answers',
      JSON.stringify(
        questions
          .filter((q) => values.answers[q.id] !== undefined)
          .map((q) => ({ question_id: q.id, answer_value: values.answers[q.id] })),
      ),
    );

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

        {questions.map((question) => {
          const label =
            locale === 'ar'
              ? question.question_text_ar
              : (question.question_text_en ?? question.question_text_ar);
          return (
            <Field key={question.id}>
              <FieldLabel>
                {label}
                {question.is_required && ' *'}
              </FieldLabel>
              <Controller
                control={control}
                name={`answers.${question.id}`}
                render={({ field }) =>
                  question.type === 'yes_no' ? (
                    <Select
                      value={field.value ? 'true' : 'false'}
                      onValueChange={(v) => field.onChange(v === 'true')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string | null) => (value === 'true' ? t('yes') : t('no'))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t('yes')}</SelectItem>
                        <SelectItem value="false">{t('no')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={(field.value as string) ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  )
                }
              />
            </Field>
          );
        })}

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
    </form>
  );
}
