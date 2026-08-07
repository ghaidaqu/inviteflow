-- ticket_types, ticket_orders, tickets, ticket_check_ins ------------------

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name_ar text not null,
  name_en text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  currency text not null default 'SAR',
  quantity_total int not null check (quantity_total >= 0),
  quantity_sold int not null default 0 check (quantity_sold >= 0),
  sale_start_at timestamptz,
  sale_end_at timestamptz,
  max_per_order int not null default 10 check (max_per_order > 0),
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (quantity_sold <= quantity_total)
);

create index ticket_types_event_id_idx on public.ticket_types (event_id);

create trigger set_ticket_types_updated_at
  before update on public.ticket_types
  for each row execute function public.set_updated_at();

create table public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  buyer_name text not null,
  buyer_email text,
  buyer_phone text,
  total_amount numeric(10, 2) not null default 0,
  currency text not null default 'SAR',
  payment_provider text not null default 'mock',
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'paid', 'failed', 'refunded')
  ),
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ticket_orders_event_id_idx on public.ticket_orders (event_id);

create trigger set_ticket_orders_updated_at
  before update on public.ticket_orders
  for each row execute function public.set_updated_at();

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticket_orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id),
  event_id uuid not null references public.events (id) on delete cascade,
  qr_token uuid not null default gen_random_uuid(),
  holder_name text not null,
  holder_email text,
  status text not null default 'valid' check (status in ('valid', 'used', 'cancelled')),
  price_paid numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_event_id_idx on public.tickets (event_id);
create index tickets_order_id_idx on public.tickets (order_id);
create unique index tickets_qr_token_idx on public.tickets (qr_token);

create trigger set_tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

create table public.ticket_check_ins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  checked_in_by uuid references public.profiles (id),
  checked_in_at timestamptz not null default now(),
  device_info text
);

create index ticket_check_ins_ticket_id_idx on public.ticket_check_ins (ticket_id);

-- Oversell prevention --------------------------------------------------------
-- Row-locks the ticket_type on every ticket insert/delete so quantity_sold
-- can never exceed quantity_total, even under concurrent purchases.

create or replace function public.handle_ticket_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_sold int;
begin
  select quantity_total, quantity_sold into v_total, v_sold
  from public.ticket_types
  where id = new.ticket_type_id
  for update;

  if v_sold + 1 > v_total then
    raise exception 'ticket_type % is sold out', new.ticket_type_id
      using errcode = 'check_violation';
  end if;

  update public.ticket_types
  set quantity_sold = quantity_sold + 1
  where id = new.ticket_type_id;

  return new;
end;
$$;

create trigger on_ticket_insert
  before insert on public.tickets
  for each row execute function public.handle_ticket_insert();

create or replace function public.handle_ticket_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ticket_types
  set quantity_sold = greatest(quantity_sold - 1, 0)
  where id = old.ticket_type_id;

  return old;
end;
$$;

create trigger on_ticket_delete
  after delete on public.tickets
  for each row execute function public.handle_ticket_delete();

-- RLS -----------------------------------------------------------------------
-- As with guests/rsvp_responses, public ticket purchase and QR check-in are
-- handled exclusively through the SECURITY DEFINER RPC functions in
-- 20260807000008_rpc_public_actions.sql — no anon write policies here.

alter table public.ticket_types enable row level security;
alter table public.ticket_orders enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_check_ins enable row level security;

create policy "ticket_types_manage_members"
  on public.ticket_types for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "ticket_types_select_public"
  on public.ticket_types for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.visibility = 'public'
        and e.status = 'published'
        and e.deleted_at is null
    )
  );

create policy "ticket_orders_manage_members"
  on public.ticket_orders for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "tickets_manage_members"
  on public.tickets for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "ticket_check_ins_select_members"
  on public.ticket_check_ins for select
  to authenticated
  using (
    public.is_org_member((
      select e.organization_id
      from public.tickets t
      join public.events e on e.id = t.event_id
      where t.id = ticket_id
    ))
  );

create policy "ticket_check_ins_insert_members"
  on public.ticket_check_ins for insert
  to authenticated
  with check (
    public.is_org_member((
      select e.organization_id
      from public.tickets t
      join public.events e on e.id = t.event_id
      where t.id = ticket_id
    ))
  );
