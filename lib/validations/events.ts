import { z } from 'zod';

export const eventTypes = [
  'wedding',
  'graduation',
  'university_meetup',
  'workshop',
  'sports',
  'conference',
  'private',
  'other',
] as const;

export const eventVisibilities = ['public', 'private'] as const;
export const eventLocales = ['ar', 'en'] as const;

const optionalUrl = z
  .union([z.url({ error: 'urlInvalid' }), z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalDateTime = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), { error: 'dateInvalid' });

export const eventFormSchema = z.object({
  name: z.string().trim().min(2, { error: 'nameTooShort' }).max(150, { error: 'nameTooLong' }),
  type: z.enum(eventTypes, { error: 'typeRequired' }),
  description: optionalText,
  eventDate: optionalDateTime,
  rsvpDeadline: optionalDateTime,
  locationText: optionalText,
  locationMapUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  primaryLocale: z.enum(eventLocales),
  visibility: z.enum(eventVisibilities),
  isRsvpEnabled: z.boolean(),
  isQrEnabled: z.boolean(),
  isPasswordProtected: z.boolean(),
  password: optionalText,
});

export type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormOutput = z.output<typeof eventFormSchema>;
