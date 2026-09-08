-- Organizer-controlled: send every guest who left a phone/email the final
-- attending/not-attending tally (and any custom-question breakdown) the
-- moment the event's own rsvp_deadline passes, instead of only ever going
-- out when someone remembers to click "Send results now" in the
-- dashboard (see components/dashboard/broadcast-results-button.tsx,
-- unchanged — still there for an event with no deadline, or whenever an
-- organizer wants to send it manually).
--
-- results_broadcast_at is the guard against sending it twice: the trigger
-- mechanism (a periodic check, not a one-shot timer — see
-- app/api/cron/broadcast-results/route.ts) has to be safe to call
-- repeatedly, and "already sent, skip" is the simplest way to make that
-- true without extra locking.
alter table public.event_settings
  add column if not exists auto_broadcast_results boolean not null default false;

alter table public.events
  add column if not exists results_broadcast_at timestamptz;
