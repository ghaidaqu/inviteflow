-- A claim state for the reminders cron.
--
-- The route used to select every due reminder and only flip it to 'sent'
-- after the whole per-guest send loop had finished. Two overlapping runs
-- therefore saw the same rows and every attending guest received the
-- reminder twice; and a run that died partway — a deploy restart, a
-- timeout on a long guest list — left the row 'scheduled', so the next run
-- started again from the top and re-sent to everyone it had already
-- reached.
--
-- 'sending' lets the route claim a row atomically before it does any work:
--   update ... set status='sending' where id=$1 and status='scheduled'
-- Only one runner gets a row back; the other moves on.
--
-- A row stuck in 'sending' means a run died mid-flight. That is deliberately
-- left for a human rather than auto-retried: re-running it would re-send to
-- guests who already received the message, which is the failure this is
-- meant to prevent.
alter table public.event_reminders
  drop constraint if exists event_reminders_status_check;

alter table public.event_reminders
  add constraint event_reminders_status_check
  check (status in ('scheduled', 'sending', 'sent', 'canceled'));
