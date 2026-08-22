'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type GulfCountry = { code: string; dial: string };

// GCC only, not a full country list — the actual ask was "a non-Saudi
// Gulf number," not global coverage. Saudi first since it's the default
// for every phone field in the app.
const GULF_COUNTRIES: GulfCountry[] = [
  { code: 'SA', dial: '966' },
  { code: 'AE', dial: '971' },
  { code: 'KW', dial: '965' },
  { code: 'QA', dial: '974' },
  { code: 'BH', dial: '973' },
  { code: 'OM', dial: '968' },
];

const DEFAULT_COUNTRY = GULF_COUNTRIES[0]!;

function parsePhone(value: string): { country: GulfCountry; local: string } {
  const digits = value.replace(/\D/g, '');
  for (const country of GULF_COUNTRIES) {
    if (digits.startsWith(country.dial)) {
      return { country, local: digits.slice(country.dial.length) };
    }
  }
  // No recognized dial code in the stored value — most likely a bare
  // local number (or empty) rather than some other country entirely, so
  // show it under Saudi with a leading 0 stripped the way it'd normally
  // be typed, instead of losing the digits.
  return { country: DEFAULT_COUNTRY, local: digits.replace(/^0/, '') };
}

function composePhone(country: GulfCountry, local: string): string {
  const digits = local.replace(/\D/g, '').replace(/^0/, '');
  return digits ? `+${country.dial}${digits}` : '';
}

/**
 * A country picker + local-number field for Gulf phone numbers, instead
 * of one bare `type="tel"` input whose placeholder just assumed everyone
 * both knew and remembered to type "+966" themselves. Saudi (the
 * default) still just wants the number as people actually type it —
 * 05XXXXXXXX, no country code — anyone else picks their own GCC country
 * and the dial code is handled for them.
 *
 * Always emits a full "+<dial><local>" value, exactly the explicit-
 * international form lib/utils/phone.ts's normalizePhone already parses
 * — no backend change needed. Works both controlled (pass `value` +
 * `onChange`) and inside a plain `<form action={...}>` (pass `name`;
 * a hidden input carries the composed value into that form's FormData).
 */
export function PhoneInput({
  id,
  name,
  value,
  onChange,
  required,
  'aria-invalid': ariaInvalid,
  autoComplete,
}: {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  'aria-invalid'?: boolean;
  autoComplete?: string;
}) {
  const t = useTranslations('PhoneInput');
  const [country, setCountry] = useState(() => parsePhone(value ?? '').country);
  const [local, setLocal] = useState(() => parsePhone(value ?? '').local);
  // Tracks the last value *this component* emitted, so an externally
  // changed `value` (e.g. opening the edit dialog for a different guest)
  // re-seeds the field, without a self-triggered onChange bouncing back
  // in and resetting the cursor mid-keystroke.
  const lastEmitted = useRef(value ?? '');

  useEffect(() => {
    if (value !== undefined && value !== lastEmitted.current) {
      const parsed = parsePhone(value);
      setCountry(parsed.country);
      setLocal(parsed.local);
      lastEmitted.current = value;
    }
  }, [value]);

  function emit(nextCountry: GulfCountry, nextLocal: string) {
    const composed = composePhone(nextCountry, nextLocal);
    lastEmitted.current = composed;
    onChange?.(composed);
  }

  return (
    <div className="flex gap-2" dir="ltr">
      <Select
        value={country.code}
        onValueChange={(code) => {
          const next = GULF_COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
          setCountry(next);
          emit(next, local);
        }}
      >
        <SelectTrigger className="w-24 shrink-0" aria-label={t('countryLabel')}>
          <SelectValue>{`+${country.dial}`}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {GULF_COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {t(`countries.${c.code}`)} +{c.dial}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        dir="ltr"
        autoComplete={autoComplete}
        required={required}
        aria-invalid={ariaInvalid}
        placeholder={country.code === 'SA' ? '05XXXXXXXX' : t('localPlaceholder')}
        value={local}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '');
          setLocal(next);
          emit(country, next);
        }}
        className="flex-1"
      />
      {name && <input type="hidden" name={name} value={composePhone(country, local)} />}
    </div>
  );
}
