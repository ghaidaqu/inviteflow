'use client';

import { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { updateRsvpAction, type RsvpActionState } from '@/lib/actions/rsvp';
import type { QuestionWithOptions } from '@/lib/services/questions.service';
import type { RsvpByToken } from '@/lib/services/rsvp.service';

type FormValues = {
  answers: Record<string, string | string[] | boolean>;
};

/**
 * The "RSVP" track, standalone — a poll/questionnaire completely separate
 * from the invitation accept/decline (see rsvp-form.tsx). Reuses the same
 * response record (via updateRsvpAction) but resubmits the guest's existing
 * status/companions/message unchanged, so this screen only ever asks about
 * the organizer's own questions.
 */
export function RsvpQuestionsForm({
  token,
  data,
  questions,
}: {
  token: string;
  data: RsvpByToken;
  questions: QuestionWithOptions[];
}) {
  const t = useTranslations('Rsvp');
  const tErrors = useTranslations('Rsvp.errors');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const existingAnswers = Object.fromEntries(
    data.answers.map((a) => [a.question_id, a.answer_value as string | string[] | boolean]),
  );

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { answers: existingAnswers },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    setSaved(false);

    const missingRequired = questions.some((q) => {
      if (!q.is_required) return false;
      const value = values.answers[q.id];
      // An empty selection array is truthy in JS but still "no answer" —
      // multi_choice needs its own emptiness check, unlike every other type.
      return Array.isArray(value) ? value.length === 0 : !value;
    });
    if (missingRequired) {
      setServerError('answerRequired');
      return;
    }

    const formData = new FormData();
    // Preserve the guest's existing invitation response untouched — this
    // screen only edits question answers.
    formData.set('status', data.response.status);
    formData.set('message', data.response.message ?? '');
    formData.set('companionsNames', JSON.stringify(data.response.companions_names));
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-card flex flex-col gap-6 rounded-3xl border p-5 shadow-sm sm:p-7"
    >
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
        {questions.map((question) => (
          <CustomQuestionField key={question.id} question={question} control={control} />
        ))}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t('submitting') : t('saveChanges')}
        </Button>
      </FieldGroup>
    </form>
  );
}

function CustomQuestionField({
  question,
  control,
}: {
  question: QuestionWithOptions;
  control: ReturnType<typeof useForm<FormValues>>['control'];
}) {
  const locale = useLocale();
  const label =
    locale === 'ar'
      ? question.question_text_ar
      : (question.question_text_en ?? question.question_text_ar);

  if (question.type === 'yes_no') {
    return (
      <Field orientation="horizontal">
        <FieldLabel className="flex-1 font-normal">
          {label}
          {question.is_required && ' *'}
        </FieldLabel>
        <Controller
          control={control}
          name={`answers.${question.id}`}
          render={({ field }) => (
            <Switch checked={field.value === true} onCheckedChange={field.onChange} />
          )}
        />
      </Field>
    );
  }

  if (question.type === 'single_choice') {
    return (
      <Field>
        <FieldLabel>
          {label}
          {question.is_required && ' *'}
        </FieldLabel>
        <Controller
          control={control}
          name={`answers.${question.id}`}
          render={({ field }) => (
            <Select value={field.value as string} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) => {
                    const selected = question.options.find((o) => o.id === value);
                    if (!selected) return '';
                    return locale === 'ar'
                      ? selected.option_text_ar
                      : (selected.option_text_en ?? selected.option_text_ar);
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {locale === 'ar'
                      ? option.option_text_ar
                      : (option.option_text_en ?? option.option_text_ar)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    );
  }

  if (question.type === 'multi_choice') {
    return (
      <Field>
        <FieldLabel>
          {label}
          {question.is_required && ' *'}
        </FieldLabel>
        <Controller
          control={control}
          name={`answers.${question.id}`}
          render={({ field }) => {
            const selected = Array.isArray(field.value) ? (field.value as string[]) : [];
            return (
              <div className="flex flex-col gap-2">
                {question.options.map((option) => {
                  const optionLabel =
                    locale === 'ar'
                      ? option.option_text_ar
                      : (option.option_text_en ?? option.option_text_ar);
                  const checked = selected.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          field.onChange(
                            next
                              ? [...selected, option.id]
                              : selected.filter((id) => id !== option.id),
                          );
                        }}
                      />
                      {optionLabel}
                    </label>
                  );
                })}
              </div>
            );
          }}
        />
      </Field>
    );
  }

  if (question.type === 'number') {
    return (
      <Field>
        <FieldLabel>
          {label}
          {question.is_required && ' *'}
        </FieldLabel>
        <Controller
          control={control}
          name={`answers.${question.id}`}
          render={({ field }) => (
            <Input
              type="number"
              value={(field.value as string) ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
            />
          )}
        />
      </Field>
    );
  }

  if (question.type === 'long_text') {
    return (
      <Field>
        <FieldLabel>
          {label}
          {question.is_required && ' *'}
        </FieldLabel>
        <Controller
          control={control}
          name={`answers.${question.id}`}
          render={({ field }) => (
            <Textarea
              rows={3}
              value={(field.value as string) ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
            />
          )}
        />
      </Field>
    );
  }

  // short_text is the only type meant to fall back to a plain input.
  return (
    <Field>
      <FieldLabel>
        {label}
        {question.is_required && ' *'}
      </FieldLabel>
      <Controller
        control={control}
        name={`answers.${question.id}`}
        render={({ field }) => (
          <Input
            value={(field.value as string) ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
          />
        )}
      />
    </Field>
  );
}
