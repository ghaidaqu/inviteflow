import { z } from 'zod';

export const eventSettingsFormSchema = z.object({
  allowMaybe: z.boolean(),
  collectCompanions: z.boolean(),
  maxCompanions: z.coerce.number().int().min(0).max(50),
  collectMessage: z.boolean(),
  allowGuestEdit: z.boolean(),
});

export type EventSettingsFormInput = z.input<typeof eventSettingsFormSchema>;
export type EventSettingsFormOutput = z.output<typeof eventSettingsFormSchema>;
