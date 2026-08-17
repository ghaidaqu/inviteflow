/**
 * The only real values ever written to event_designs.template. The DB
 * column itself is unconstrained free text (see the migration), so this
 * app-side list is the actual source of truth — both the write path
 * (lib/actions/events.ts) and the render path
 * (components/public/event-hero) validate against it and fall back to
 * 'classic' for anything else.
 */
export const eventTemplates = ['classic', 'editorial', 'minimal'] as const;
export type EventTemplate = (typeof eventTemplates)[number];

export function isEventTemplate(value: string): value is EventTemplate {
  return (eventTemplates as readonly string[]).includes(value);
}
