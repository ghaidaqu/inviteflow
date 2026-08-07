-- notifications & audit_logs -----------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  type text not null check (type in ('rsvp_new', 'ticket_purchased', 'ticket_checked_in')),
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_organization_id_idx on public.notifications (organization_id);
create index notifications_org_unread_idx on public.notifications (organization_id, is_read);

alter table public.notifications enable row level security;

create policy "notifications_select_members"
  on public.notifications for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "notifications_update_members"
  on public.notifications for update
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- No insert/delete policies: notifications are only ever written by the
-- SECURITY DEFINER trigger functions below, which bypass RLS.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

-- Explicit deny-all for client roles: audit_logs is written only by
-- SECURITY DEFINER functions/service-role server code. The service role
-- bypasses RLS entirely, so this only blocks anon/authenticated access;
-- future admin tooling will read it via the service role.
create policy "audit_logs_no_client_access"
  on public.audit_logs for select
  to anon, authenticated
  using (false);

-- Automatic in-app notifications ---------------------------------------------

create or replace function public.notify_new_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_guest_name text;
begin
  select e.organization_id into v_organization_id
  from public.events e where e.id = new.event_id;

  select g.name into v_guest_name
  from public.guests g where g.id = new.guest_id;

  insert into public.notifications (organization_id, event_id, type, payload)
  values (
    v_organization_id,
    new.event_id,
    'rsvp_new',
    jsonb_build_object('response_id', new.id, 'guest_name', v_guest_name, 'status', new.status)
  );

  return new;
end;
$$;

create trigger on_rsvp_created_notify
  after insert on public.rsvp_responses
  for each row execute function public.notify_new_rsvp();

create or replace function public.notify_ticket_purchased()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  if new.payment_status = 'paid'
    and (tg_op = 'INSERT' or old.payment_status is distinct from 'paid')
  then
    select e.organization_id into v_organization_id
    from public.events e where e.id = new.event_id;

    insert into public.notifications (organization_id, event_id, type, payload)
    values (
      v_organization_id,
      new.event_id,
      'ticket_purchased',
      jsonb_build_object('order_id', new.id, 'buyer_name', new.buyer_name, 'total_amount', new.total_amount)
    );
  end if;

  return new;
end;
$$;

create trigger on_ticket_order_paid_notify
  after insert or update on public.ticket_orders
  for each row execute function public.notify_ticket_purchased();

create or replace function public.notify_ticket_checked_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_event_id uuid;
  v_holder_name text;
begin
  select t.event_id, t.holder_name, e.organization_id
  into v_event_id, v_holder_name, v_organization_id
  from public.tickets t
  join public.events e on e.id = t.event_id
  where t.id = new.ticket_id;

  insert into public.notifications (organization_id, event_id, type, payload)
  values (
    v_organization_id,
    v_event_id,
    'ticket_checked_in',
    jsonb_build_object('ticket_id', new.ticket_id, 'holder_name', v_holder_name, 'checked_in_at', new.checked_in_at)
  );

  return new;
end;
$$;

create trigger on_ticket_check_in_notify
  after insert on public.ticket_check_ins
  for each row execute function public.notify_ticket_checked_in();
