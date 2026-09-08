'use client';

import { useState, useTransition } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RsvpStatusPicker } from '@/components/public/rsvp-status-picker';
import {
  CustomQuestionField,
  hasAllRequiredAnswers,
} from '@/components/public/custom-question-field';
import { submitRsvpAction, type RsvpActionState } from '@/lib/actions/rsvp';
import { Link } from '@/i18n/navigation';
import type { QuestionWithOptions } from '@/lib/services/questions.service';
import { Trash2Icon, PlusIcon, CheckCircle2Icon } from 'lucide-react';

type EventSettings = {
  allow_attending: boolean;
  allow_not_attending: boolean;
  collect_companions: boolean;
  max_companions: number;
  collect_message: boolean;
  require_phone: boolean;
};

type FormValues = {
  guestName: string;
  phone: string;
  email: string;
  status: 'attending' | 'not_attending' | '';
  companionsNames: { name: string }[];
  message: string;
  answers: Record<string, string | string[] | boolean>;
  consent: boolean;
};

// One page, one submission — name, phone/email, response, companions, the
// organizer's message, and any custom questions all together. This used
// to be two separate steps (accept/decline first, a distinct "answer the
// organizer's questions" follow-up after) for the Digital Invitation
// track's own reasons, but the Link track has no equivalent: everyone who
// opens this link is already a real prospective guest doing one thing —
// registering — so splitting it in two just meant most people skipped the
// second step. submitRsvpAction already accepted answers alongside the
// rest in one call (see readAnswers() there); this was purely a front-end
// gap.
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
  const [qrCardUrl, setQrCardUrl] = useState<string | null>(null);

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      guestName: '',
      phone: '',
      email: '',
      status: '',
      companionsNames: [],
      message: '',
      answers: {},
      consent: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'companionsNames' });

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (!values.status || !values.guestName) {
      setServerError('invalidInput');
      return;
    }
    if (!values.consent) {
      setServerError('consentRequired');
      return;
    }
    if (settings.require_phone && !values.phone.trim()) {
      setServerError('phoneRequired');
      return;
    }
    if (!hasAllRequiredAnswers(questions, values.answers)) {
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
        setQrCardUrl(result.qrCardUrl ?? null);
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
      <div className="animate-in fade-in zoom-in-95 duration-500 ease-out">
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-6 text-center">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <CheckCircle2Icon className="size-6" />
          </div>
          <p className="text-lg font-bold">{t('thankYouTitle')}</p>
          <p className="text-muted-foreground">{t('thankYouDescription')}</p>

          {qrCardUrl && (
            <div className="flex w-full flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCardUrl}
                alt={t('qrCardAlt')}
                className="w-full max-w-56 rounded-2xl border shadow-sm"
              />
              <p className="text-muted-foreground text-sm">{t('qrCardCaption')}</p>
            </div>
          )}

          <Link
            href={`/rsvp/${secureToken}`}
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            {t('editLinkLabel')}
          </Link>
          <Button variant="outline" onClick={handleShareWhatsapp} className="w-full">
            {t('whatsappShareButton')}
          </Button>
        </div>
      </div>
    );
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

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="guestName">{t('nameLabel')}</FieldLabel>
          <Input id="guestName" {...register('guestName', { required: true })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={serverError === 'phoneRequired'}>
            <FieldLabel htmlFor="phone">
              {t('phoneLabel')}
              {settings.require_phone ? ' *' : ''}
            </FieldLabel>
            <Controller
              control={control}
              name="phone"
              rules={{ required: settings.require_phone }}
              render={({ field }) => (
                <PhoneInput id="phone" value={field.value} onChange={field.onChange} />
              )}
            />
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
              <RsvpStatusPicker
                id="status"
                value={field.value}
                onChange={field.onChange}
                allowAttending={settings.allow_attending}
                allowNotAttending={settings.allow_not_attending}
              />
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('a11yRemoveCompanion')}
                  onClick={() => remove(index)}
                >
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

        {questions.length > 0 && (
          <div className="flex flex-col gap-4 border-t pt-4">
            {questions.map((question) => (
              <CustomQuestionField
                key={question.id}
                question={question}
                control={control as never}
              />
            ))}
          </div>
        )}

        <Field data-invalid={serverError === 'consentRequired'}>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <Controller
              control={control}
              name="consent"
              render={({ field }) => (
                <Checkbox
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span className="text-muted-foreground">
              {t.rich('consentLabel', {
                privacyLink: (chunks) => (
                  <Link href="/privacy" target="_blank" className="text-primary underline">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
        </Field>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </FieldGroup>
    </form>
  );
}
