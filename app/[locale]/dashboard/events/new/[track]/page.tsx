import { redirect } from 'next/navigation';

const TRACKS = ['invitation', 'rsvp'] as const;

/**
 * Kept only as a redirect. This route used to render the dashboard's own
 * bare EventForm, which was a second, worse way to create the same thing:
 * it had no "try it before you commit" step and — because createEvent
 * defaults to 'draft' — left the organizer with an event whose
 * invitations sent but whose Accept/Decline replies were rejected
 * server-side, and whose public link 404'd until they noticed the publish
 * button. The wizard at /start/[track] publishes on creation and offers
 * the trial send, so it's the only creation path now.
 *
 * An unknown track lands on the chooser rather than a 404 — arriving here
 * by a stale link should put you somewhere useful.
 */
export default async function LegacyNewEventPage({
  params,
}: {
  params: Promise<{ locale: string; track: string }>;
}) {
  const { locale, track } = await params;
  const isKnown = (TRACKS as readonly string[]).includes(track);
  redirect(isKnown ? `/${locale}/start/${track}` : `/${locale}/dashboard/events/new`);
}
