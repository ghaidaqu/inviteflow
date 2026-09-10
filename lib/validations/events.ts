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
export const eventTracks = ['invitation', 'rsvp', 'institutional'] as const;

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
  // No arbitrary minimum beyond "not empty" — a 2-char floor rejected
  // genuinely short real names for no real reason.
  name: z.string().trim().min(1, { error: 'nameTooShort' }).max(150, { error: 'nameTooLong' }),
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
  eventEndDate: optionalDateTime,
  // Set once, at creation only — see EventForm's `track` prop, which is
  // only ever passed when creating (never editing, since an event's
  // track can't change after the fact). Left undefined when editing an
  // event created before this existed, which keeps that event's track
  // honestly "unknown" rather than guessed at.
  track: z.enum(eventTracks).optional(),
  // How many people are being invited. Decided at creation because the
  // invitation is priced on it, and it caps the main guest list from
  // then on. Empty means no limit — which is every link-track event and
  // everything created before this field existed.
  guestLimit: z
    .union([z.literal(''), z.coerce.number().int().min(1).max(100000)])
    .optional()
    .transform((value) => (value === '' || value === undefined ? undefined : value)),
  // Institutional track only — see EventForm's `track` prop. Left
  // undefined/blank for the other two tracks.
  organizationName: optionalText,
  organizationLogoUrl: optionalUrl,
});

export type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormOutput = z.output<typeof eventFormSchema>;
