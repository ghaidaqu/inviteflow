import { z } from 'zod';

export const rsvpStatuses = ['attending', 'not_attending', 'maybe'] as const;

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
