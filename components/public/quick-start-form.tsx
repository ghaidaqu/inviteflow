'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CoverImageUpload } from '@/components/dashboard/cover-image-upload';
import { InlineQuestionsBuilder } from '@/components/dashboard/inline-questions-builder';
import { eventTypes } from '@/lib/validations/events';
import type { QuestionInput } from '@/lib/validations/questions';
import type { QuickStartDraft } from '@/lib/actions/quick-start';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

const DRAFT_KEY = 'inviteflow_draft_event';

/**
 * The full, real event-creation form — same fields as the authenticated
 * dashboard's EventForm (cover image, QR toggle, and custom questions for
 * the Link track) — just reachable with no login wall. Nothing is
 * persisted until the organizer authenticates (see /finish): this is
 * local React state the whole way through, handed off to auth via
 * sessionStorage.
 */
export function QuickStartForm({ track }: { track: 'invitation' | 'rsvp' }) {
  const t = useTranslations('QuickStart');
  const tTypes = useTranslations('Events.types');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  const [name, setName] = useState('');
  const [type, setType] = useState('other');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isQrEnabled, setIsQrEnabled] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [nameError, setNameError] = useState(false);

  const finishHref = `/register?next=${encodeURIComponent(`/${locale}/start/${track}/finish`)}`;

  function saveDraftAndProceed(e: React.MouseEvent) {
    if (!name.trim()) {
      e.preventDefault();
      setNameError(true);
      return;
    }
    const draft: QuickStartDraft = {
      track,
      name,
      type,
      description,
      eventDate,
      locationText,
      coverImageUrl,
      isQrEnabled,
      questions,
      guestName,
      guestPhone,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={nameError}>
          <FieldLabel htmlFor="qs-name">{t('nameLabel')}</FieldLabel>
          <Input
            id="qs-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameError(false);
            }}
            placeholder={t('namePlaceholder')}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="qs-type">{t('typeLabel')}</FieldLabel>
          <Select value={type} onValueChange={(value) => value && setType(value)}>
            <SelectTrigger id="qs-type" className="w-full">
              <SelectValue>{() => tTypes(type)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((eventType) => (
                <SelectItem key={eventType} value={eventType}>
                  {tTypes(eventType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="qs-description">{t('descriptionLabel')}</FieldLabel>
          <Textarea
            id="qs-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="qs-date">{t('eventDateLabel')}</FieldLabel>
            <Input
              id="qs-date"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="qs-location">{t('locationTextLabel')}</FieldLabel>
            <Input
              id="qs-location"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="qs-cover">{t('coverImageLabel')}</FieldLabel>
          <CoverImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="qs-qr" className="flex-1 font-normal">
            {t('qrLabel')}
          </FieldLabel>
          <Switch id="qs-qr" checked={isQrEnabled} onCheckedChange={setIsQrEnabled} />
        </Field>

        {track === 'rsvp' && <InlineQuestionsBuilder value={questions} onChange={setQuestions} />}
      </FieldGroup>

      <div className="border-t pt-6">
        <h2 className="text-lg font-bold tracking-tight">{t('trialTitle')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('trialDescription')}</p>

        <FieldGroup className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="qs-guest-name">{t('guestNameLabel')}</FieldLabel>
              <Input
                id="qs-guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="qs-guest-phone">{t('guestPhoneLabel')}</FieldLabel>
              <Input
                id="qs-guest-phone"
                type="tel"
                dir="ltr"
                placeholder="+9665XXXXXXXX"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>

        <Button
          size="lg"
          className="mt-6 w-full"
          nativeButton={false}
          onClick={saveDraftAndProceed}
          render={<Link href={finishHref} />}
        >
          {t('finishButton')}
          <ArrowIcon className="size-4 rtl:rotate-180" />
        </Button>
        <p className="text-muted-foreground mt-2 text-center text-xs">{t('finishHint')}</p>
      </div>
    </div>
  );
}
