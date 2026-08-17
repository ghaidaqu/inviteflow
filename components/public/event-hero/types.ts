import type { Database } from '@/types/supabase';

export { eventTemplates as EVENT_TEMPLATES, isEventTemplate } from '@/lib/validations/event-design';
export type { EventTemplate } from '@/lib/validations/event-design';

type EventRow = Database['public']['Tables']['events']['Row'];

export type EventHeroProps = {
  event: EventRow;
  typeLabel: string;
  /** Pre-formatted "By {name}" string, or null when there's no org branding. */
  organizedByLabel: string | null;
};
