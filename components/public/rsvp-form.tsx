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
import { submitRsvpAction, type RsvpActionState } from '@/lib/actions/rsvp';
import { Link } from '@/i18n/navigation';
import { Trash2Icon, PlusIcon, CheckCircle2Icon, MessageCircleIcon } from 'lucide-react';

type EventSettings = {
  allow_attending: boolean;
  allow_not_attending: boolean;
  collect_companions: boolean;
  max_companions: number;
  collect_message: boolean;
};

type FormValues = {
  guestName: string;
  phone: string;
  email: string;
  status: 'attending' | 'not_attending' | '';
  companionsNames: { name: string }[];
  message: string;
};

// This form is deliberately "الدعوة الرقمية" only — a simple accept/decline
// with no custom questions. If the event also has RSVP questions (a
// separate, poll-style track — see components/public/rsvp-questions-form.tsx
// and the /rsvp/[token]/questions page), the thank-you screen below offers
// a distinct, clearly separate follow-up step rather than bundling them
// into one form.
export function RsvpForm({
  eventSlug,
  eventName,
  settings,
  hasQuestions,
}: {
  eventSlug: string;
  eventName: string;
  settings: EventSettings;
  hasQuestions: boolean;
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
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'companionsNames' });

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (!values.status || !values.guestName) {
      setServerError('invalidInput');
      return;
    }

    const formData = new FormData();
    formData.set('guestName', values.guestName);
    formData.set('phone', values.phone);
    formData.set('email', values.email);
    formData.set('status', values.status);
    formData.set('message', values.message);
    formData.set('companionsNames', JSON.stringify(values.companionsNames.map((c) => c.name)));
    formData.set('answers', '[]');

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
      <div className="animate-in fade-in zoom-in-95 flex flex-col gap-4 duration-500 ease-out">
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-6 text-center">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <CheckCircle2Icon className="size-6" />
          </div>
          <p className="text-lg font-bold">{t('thankYouTitle')}</p>
          <p className="text-muted-foreground">{t('thankYouDescription')}</p>
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

        {hasQuestions && (
          <div className="bg-card border-primary/20 flex flex-col items-center gap-3 rounded-2xl border p-6 text-center">
            <div className="bg-accent/25 text-accent-foreground flex size-12 items-center justify-center rounded-full">
              <MessageCircleIcon className="size-6" />
            </div>
            <p className="text-lg font-bold">{t('questionsFollowUpTitle')}</p>
            <p className="text-muted-foreground">{t('questionsFollowUpDescription')}</p>
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href={`/rsvp/${secureToken}/questions`} />}
            >
              {t('questionsFollowUpButton')}
            </Button>
          </div>
        )}
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

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </FieldGroup>
    </form>
  );
}
