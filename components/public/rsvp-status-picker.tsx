'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2Icon, XCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The actual moment of response — deliberately NOT a dropdown. A guest
 * opening this on their phone should be able to answer with one tap on
 * something that reads as a real choice, not pick an option out of a
 * generic <select>. Two large cards (or one, full-width, if the
 * organizer only allows a single response option) instead.
 */
export function RsvpStatusPicker({
  value,
  onChange,
  allowAttending,
  allowNotAttending,
  id,
}: {
  value: 'attending' | 'not_attending' | '';
  onChange: (value: 'attending' | 'not_attending') => void;
  allowAttending: boolean;
  allowNotAttending: boolean;
  id?: string;
}) {
  const t = useTranslations('Rsvp');
  const bothAllowed = allowAttending && allowNotAttending;

  return (
    <div id={id} role="radiogroup" className={cn('grid gap-3', bothAllowed && 'grid-cols-2')}>
      {allowAttending && (
        <button
          type="button"
          role="radio"
          aria-checked={value === 'attending'}
          onClick={() => onChange('attending')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all duration-200 ease-out',
            value === 'attending'
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-border text-foreground hover:border-primary/40 hover:bg-primary/5',
          )}
        >
          <CheckCircle2Icon className="size-7" />
          <span className="text-base font-bold">{t('status.attending')}</span>
        </button>
      )}
      {allowNotAttending && (
        <button
          type="button"
          role="radio"
          aria-checked={value === 'not_attending'}
          onClick={() => onChange('not_attending')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all duration-200 ease-out',
            value === 'not_attending'
              ? 'border-foreground bg-foreground/5 text-foreground shadow-sm'
              : 'border-border text-foreground hover:border-foreground/30 hover:bg-foreground/5',
          )}
        >
          <XCircleIcon className="size-7" />
          <span className="text-base font-bold">{t('status.not_attending')}</span>
        </button>
      )}
    </div>
  );
}
