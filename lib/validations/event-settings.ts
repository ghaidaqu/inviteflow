import { z } from 'zod';

export const eventSettingsFormSchema = z
  .object({
    allowAttending: z.boolean(),
    allowNotAttending: z.boolean(),
    allowMaybe: z.boolean(),
    collectCompanions: z.boolean(),
    maxCompanions: z.coerce.number().int().min(0).max(50),
    collectMessage: z.boolean(),
    allowGuestEdit: z.boolean(),
  })
  // At least one response option has to be open, or a guest who opens the
  // RSVP form has nothing they're allowed to submit.
  .refine((v) => v.allowAttending || v.allowNotAttending || v.allowMaybe, {
    message: 'atLeastOneStatus',
    path: ['allowAttending'],
  });

export type EventSettingsFormInput = z.input<typeof eventSettingsFormSchema>;
export type EventSettingsFormOutput = z.output<typeof eventSettingsFormSchema>;
