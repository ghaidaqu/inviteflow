import { z } from 'zod';

// Turning both allowAttending and allowNotAttending off is a real, allowed
// choice — not an error to block. It means the organizer doesn't want RSVP
// tracking at all for this event, just an announcement; the guest-facing
// pages hide the RSVP option entirely whenever both are off (see
// events/[slug]/page.tsx and its /rsvp route), so there's no dead-end form
// with nothing to submit.
export const eventSettingsFormSchema = z.object({
  allowAttending: z.boolean(),
  allowNotAttending: z.boolean(),
  collectCompanions: z.boolean(),
  maxCompanions: z.coerce.number().int().min(0).max(50),
  collectMessage: z.boolean(),
  allowGuestEdit: z.boolean(),
  requirePhone: z.boolean(),
  autoBroadcastResults: z.boolean(),
  // A decline hands the place to the next person on the reserve list,
  // with no action from the organizer. Does nothing at all when the
  // event has no reserve list.
  autoReplaceDeclines: z.boolean(),
});

export type EventSettingsFormInput = z.input<typeof eventSettingsFormSchema>;
export type EventSettingsFormOutput = z.output<typeof eventSettingsFormSchema>;
