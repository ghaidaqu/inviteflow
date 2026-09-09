-- `revoke all on function ... from public` never did anything on Supabase.
--
-- Supabase grants EXECUTE on new functions to the `anon` and `authenticated`
-- roles explicitly, not through the PUBLIC pseudo-role. Revoking from
-- PUBLIC strips a grant those roles were never relying on, so every
-- function we believed was server-only stayed callable with the anon key
-- that ships in the page source.
--
-- Verified against production with the public anon key before writing
-- this: respond_via_whatsapp, promote_next_waitlisted_guest,
-- confirm_ticket_order and get_order_status all executed and returned
-- their own internal results (P0002 "guest not found", etc.) rather than
-- 42501 permission denied.
--
-- The two that mattered:
--   * respond_via_whatsapp(guest_id, status) — guest ids travel in the
--     WhatsApp reply-button payloads, so anyone holding one could forge
--     that guest's accept/decline.
--   * promote_next_waitlisted_guest(event_id) — event ids are readable
--     through events_select_public. Calling it in a loop empties an
--     organizer's reserve list while sending nobody an invitation, since
--     the actual send lives in application code, not in the function.

revoke execute on function public.respond_via_whatsapp(uuid, text) from public, anon, authenticated;
revoke execute on function public.promote_next_waitlisted_guest(uuid) from public, anon, authenticated;
revoke execute on function public.confirm_ticket_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.fail_ticket_order(uuid) from public, anon, authenticated;
revoke execute on function public.get_order_status(uuid) from public, anon, authenticated;
revoke execute on function public.create_pending_ticket_order(text, uuid, int, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.purchase_tickets_mock(text, uuid, int, text, text, text)
  from public, anon, authenticated;

-- check_rate_limit stays revoked from the client for the same reason it was
-- meant to be: a caller who can burn their own limit can also burn someone
-- else's by passing their key.
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;

-- `public` is in every revoke as well as the two named roles: Postgres
-- grants EXECUTE on a new function to PUBLIC by default, and
-- promote_next_waitlisted_guest never had that default stripped. Revoking
-- only anon and authenticated left it reachable through PUBLIC — verified
-- by re-probing with the anon key after the first attempt.

-- Deliberately NOT revoked — these are the public guest surface and are
-- reached with the anon key by design, each doing its own token or
-- ownership check internally:
--   submit_rsvp, get_rsvp_by_token, update_rsvp_by_token, get_ticket_by_qr_token
-- and check_in_ticket, which is granted to `authenticated` only and raises
-- its own insufficient_privilege for a non-member.
