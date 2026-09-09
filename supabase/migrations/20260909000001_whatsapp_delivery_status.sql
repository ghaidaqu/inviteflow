-- Delivery receipts for invitations sent over WhatsApp.
--
-- Meta already tells us what happened to every message it accepted —
-- sent / delivered / read, or failed with a reason — by POSTing a
-- "statuses" entry to our webhook. Until now the webhook logged those to
-- the console and dropped them, so an organizer who sent 200 invitations
-- had no way to learn that 30 of the numbers were wrong. They'd find out
-- on the night.
--
-- The pairing problem: a status webhook carries only Meta's own message
-- id (wamid), not the guest it was about. So the send side has to write
-- the id down at send time; that's what this table is for.
create table public.whatsapp_deliveries (
  id uuid primary key default gen_random_uuid(),
  -- Meta's wamid. Unique so a re-delivered webhook (Meta retries) updates
  -- the existing row instead of piling up duplicates.
  message_id text not null unique,
  event_id uuid not null references public.events(id) on delete cascade,
  -- Nullable: some sends aren't about a specific guest (a broadcast of
  -- results, say). Those still get a row so failures stay visible.
  guest_id uuid references public.guests(id) on delete cascade,
  -- What the message was, so the guest list can show "the invitation
  -- failed" separately from "their entry pass failed".
  kind text not null check (kind in ('invitation', 'entry_pass', 'confirmation', 'reminder', 'results')),
  -- 'accepted' is ours, not Meta's: the API took the message and we have
  -- not heard back yet. The rest mirror Meta's own status values.
  status text not null default 'accepted'
    check (status in ('accepted', 'sent', 'delivered', 'read', 'failed')),
  -- Meta's failure detail, kept verbatim so a support question can be
  -- answered without guessing (131026 = "number not on WhatsApp", etc).
  error_code integer,
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index whatsapp_deliveries_event_idx on public.whatsapp_deliveries (event_id);
create index whatsapp_deliveries_guest_idx on public.whatsapp_deliveries (guest_id);

alter table public.whatsapp_deliveries enable row level security;

-- Same shape as guests_manage_members: an org member can read the
-- delivery state of their own event's messages. Writes come from the send
-- path and the webhook, both of which use the service role and bypass
-- RLS, so members get select only — there is nothing here for a person to
-- legitimately edit by hand.
create policy "whatsapp_deliveries_select_members"
  on public.whatsapp_deliveries
  for select
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create trigger whatsapp_deliveries_set_updated_at
  before update on public.whatsapp_deliveries
  for each row execute function public.set_updated_at();
