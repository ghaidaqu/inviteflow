-- check_in_ticket was granted wider than its own code says it is.
--
-- 20260807000008 ends with `grant execute ... to authenticated` and
-- 20260909000002 records it as "granted to `authenticated` only". Neither
-- stripped the EXECUTE that Postgres hands to PUBLIC on every new
-- function, so anon could call it — the same default that left
-- promote_next_waitlisted_guest reachable, found the same way.
--
-- Nothing was exploitable: the function's first statement raises
-- 'authentication required' when auth.uid() is null, and a caller who
-- gets past that still has to be a member of the event's organization.
-- Probed with the anon key before this migration and it refused. But the
-- guard being the only thing standing is one edit away from being the
-- thing that gets removed, so the grant is now what the comment always
-- claimed.

revoke all on function public.check_in_ticket(uuid) from public, anon;
grant execute on function public.check_in_ticket(uuid) to authenticated;
