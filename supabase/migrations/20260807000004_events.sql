-- events, event_settings, event_designs -----------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  slug text not null unique,
  name text not null,
  type text not null check (
    type in (
      'wedding',
      'graduation',
      'university_meetup',
      'workshop',
      'sports',
      'conference',
      'private',
      'other'
    )
  ),
  description text,
  event_date timestamptz,
  rsvp_deadline timestamptz,
  location_text text,
  location_map_url text,
  cover_image_url text,
  primary_locale text not null default 'ar' check (primary_locale in ('ar', 'en')),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  is_rsvp_enabled boolean not null default true,
  is_ticketing_enabled boolean not null default false,
  is_qr_enabled boolean not null default false,
  password_hash text,
  status text not null default 'draft' check (status in ('draft', 'published', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index events_organization_id_idx on public.events (organization_id);
create index events_status_idx on public.events (status);

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_settings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events (id) on delete cascade,
  allow_attending boolean not null default true,
  allow_not_attending boolean not null default true,
  allow_maybe boolean not null default true,
  collect_guest_name boolean not null default true,
  collect_companions boolean not null default true,
  max_companions int not null default 5,
  collect_message boolean not null default true,
  allow_guest_edit boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger set_event_settings_updated_at
  before update on public.event_settings
  for each row execute function public.set_updated_at();

create table public.event_designs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events (id) on delete cascade,
  template text not null default 'classic',
  primary_color text,
  secondary_color text,
  font_family text,
  design_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger set_event_designs_updated_at
  before update on public.event_designs
  for each row execute function public.set_updated_at();

-- Every new event automatically gets a default settings + design row so the
-- app never has to special-case a missing row.
create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_settings (event_id) values (new.id);
  insert into public.event_designs (event_id) values (new.id);
  return new;
end;
$$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();

-- RLS -----------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.event_settings enable row level security;
alter table public.event_designs enable row level security;

create policy "events_select_members"
  on public.events for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "events_select_public"
  on public.events for select
  to anon, authenticated
  using (visibility = 'public' and status = 'published' and deleted_at is null);

create policy "events_insert_members"
  on public.events for insert
  to authenticated
  with check (public.is_org_member(organization_id));

create policy "events_update_members"
  on public.events for update
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "events_delete_owner_admin"
  on public.events for delete
  to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "event_settings_manage_members"
  on public.event_settings for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "event_settings_select_public"
  on public.event_settings for select
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

create policy "event_designs_manage_members"
  on public.event_designs for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "event_designs_select_public"
  on public.event_designs for select
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
