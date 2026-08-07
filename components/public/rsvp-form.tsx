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
import { Switch } from '@/components/ui/switch';
import { submitRsvpAction, type RsvpActionState } from '@/lib/actions/rsvp';
import { Link } from '@/i18n/navigation';
import { Trash2Icon, PlusIcon } from 'lucide-react';
import type { QuestionWithOptions } from '@/lib/services/questions.service';

type EventSettings = {
  allow_attending: boolean;
  allow_not_attending: boolean;
  allow_maybe: boolean;
  collect_companions: boolean;
  max_companions: number;
  collect_message: boolean;
};

type FormValues = {
  guestName: string;
  phone: string;
  email: string;
  status: 'attending' | 'not_attending' | 'maybe' | '';
  companionsNames: { name: string }[];
  message: string;
  answers: Record<string, string | string[] | boolean>;
};

export function RsvpForm({
  eventSlug,
  eventName,
  settings,
  questions,
}: {
  eventSlug: string;
  eventName: string;
  settings: EventSettings;
  questions: QuestionWithOptions[];
}) {
  const t = useTranslations('Rsvp');
  const tErrors = useTranslations('Rsvp.errors');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [secureToken, setSecureToken] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<FormValues['status']>('');

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      guestName: '',
      phone: '',
      email: '',
      status: '',
      companionsNames: [],
      message: '',
      answers: {},
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'companionsNames' });

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (!values.status || !values.guestName) {
      setServerError('invalidInput');
      return;
    }

    const missingRequired = questions.some((q) => q.is_required && !values.answers[q.id]);
    if (missingRequired) {
      setServerError('answerRequired');
      return;
    }

    const formData = new FormData();
    formData.set('guestName', values.guestName);
    formData.set('phone', values.phone);
    formData.set('email', values.email);
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
      const result: RsvpActionState = await submitRsvpAction(eventSlug, {}, formData);
      if (result.error) {
        setServerError(result.error);
      } else if (result.secureToken) {
        setSubmittedStatus(values.status);
        setSecureToken(result.secureToken);
      }
    });
  }

  if (secureToken) {
    function handleShareWhatsapp() {
      const statusLabel = submittedStatus ? t(`status.${submittedStatus}`) : '';
      const message = t('whatsappShareMessage', { eventName, status: statusLabel });
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    }

    return (
      <div className="bg-card flex flex-col gap-4 rounded-xl border p-6 text-center">
        <p className="text-lg font-medium">{t('thankYouTitle')}</p>
        <p className="text-muted-foreground">{t('thankYouDescription')}</p>
        <Link
          href={`/rsvp/${secureToken}`}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {t('editLinkLabel')}
        </Link>
        <Button variant="outline" onClick={handleShareWhatsapp}>
          {t('whatsappShareButton')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError as 'invalidInput')}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="guestName">{t('nameLabel')}</FieldLabel>
          <Input id="guestName" {...register('guestName', { required: true })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="phone">{t('phoneLabel')}</FieldLabel>
            <Input id="phone" type="tel" {...register('phone')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">{t('emailLabel')}</FieldLabel>
            <Input id="email" type="email" {...register('email')} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="status">{t('statusLabel')}</FieldLabel>
          <Controller
            control={control}
            name="status"
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder={t('statusPlaceholder')}>
                    {(value: string | null) =>
                      value ? t(`status.${value}` as 'status.attending') : t('statusPlaceholder')
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

        {questions.map((question) => (
          <CustomQuestionField key={question.id} question={question} control={control} />
        ))}

        {settings.collect_message && (
          <Field>
            <FieldLabel htmlFor="message">{t('messageLabel')}</FieldLabel>
            <Textarea id="message" rows={3} {...register('message')} />
          </Field>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t('submitting') : t('submit')}
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

  // short_text and multi_choice fall back to a simple text input for MVP.
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
