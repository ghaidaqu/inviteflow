'use client';

import { Controller, type Control } from 'react-hook-form';
import { useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { QuestionWithOptions } from '@/lib/services/questions.service';

/**
 * One custom question's answer field, rendered by its type. Shared
 * between the standalone RSVP-questions follow-up form and the combined
 * RSVP form (see rsvp-form.tsx) — both host forms have their own,
 * different FormValues shape (this is just one field of several among
 * different others per host), and react-hook-form's `Control<T>` isn't
 * structurally assignable across different `T`s even when they share
 * this one field, so `control` is deliberately `Control<any>` rather
 * than parameterized per host form. `name` is a dynamically-built path
 * (`answers.${question.id}`) that can't be a statically-known literal
 * either way.
 */
export function CustomQuestionField({
  question,
  control,
}: {
  question: QuestionWithOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}) {
  const locale = useLocale();
  const label =
    locale === 'ar'
      ? question.question_text_ar
      : (question.question_text_en ?? question.question_text_ar);
  const name = `answers.${question.id}`;

  if (question.type === 'yes_no') {
    return (
      <Field orientation="horizontal">
        <FieldLabel className="flex-1 font-normal">
          {label}
          {question.is_required && ' *'}
        </FieldLabel>
        <Controller
          control={control}
          name={name}
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
          name={name}
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
          name={name}
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
          name={name}
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
          name={name}
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
        name={name}
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

/** True when every required question in the list has a real answer. */
export function hasAllRequiredAnswers(
  questions: QuestionWithOptions[],
  answers: Record<string, string | string[] | boolean>,
): boolean {
  return !questions.some((q) => {
    if (!q.is_required) return false;
    const value = answers[q.id];
    // An empty selection array is truthy in JS but still "no answer" —
    // multi_choice needs its own emptiness check, unlike every other type.
    return Array.isArray(value) ? value.length === 0 : !value;
  });
}
