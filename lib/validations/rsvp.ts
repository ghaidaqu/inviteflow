import { z } from 'zod';

// A response is a clear yes or no — no 'maybe'. It muddied both the
// organizer's headcount and the guest's own decision, so it's gone from
// the whole system, not just hidden from the UI (see the migration that
// drops event_settings.allow_maybe and tightens the status constraint).
export const rsvpStatuses = ['attending', 'not_attending'] as const;

export const rsvpFormSchema = z.object({
  guestName: z.string().trim().min(1, { error: 'nameRequired' }).max(150),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  email: z
    .union([z.email({ error: 'emailInvalid' }), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  status: z.enum(rsvpStatuses, { error: 'statusRequired' }),
  companionsNames: z.array(z.object({ name: z.string().trim().min(1, { error: 'nameRequired' }) })),
  message: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type RsvpFormInput = z.input<typeof rsvpFormSchema>;
export type RsvpFormOutput = z.output<typeof rsvpFormSchema>;
