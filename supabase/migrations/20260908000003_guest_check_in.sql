-- Door check-in: an organizer scans a guest's entry-QR (see
-- generateAndUploadEntryCard — the QR content is the guest's own RSVP
-- edit link) with their phone's camera from the dashboard, and this
-- records when that pass was actually used. No new RPC needed — the
-- existing "rsvp_responses_manage_members" RLS policy already lets an
-- authenticated org member update any response row belonging to their
-- own organization's events, which is exactly the access check-in needs.
alter table public.rsvp_responses
  add column if not exists checked_in_at timestamptz;
