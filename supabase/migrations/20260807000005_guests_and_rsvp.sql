-- guests, rsvp_responses, custom_questions/options/answers ----------------

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text,
  phone text,
  email text,
  secure_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index guests_event_id_idx on public.guests (event_id);
create unique index guests_secure_token_idx on public.guests (secure_token);

create trigger set_guests_updated_at
  before update on public.guests
  for each row execute function public.set_updated_at();

create table public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  status text not null check (status in ('attending', 'not_attending', 'maybe')),
  companions_count int not null default 0 check (companions_count >= 0),
  companions_names jsonb not null default '[]'::jsonb,
  message text,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, guest_id)
);

create index rsvp_responses_event_id_idx on public.rsvp_responses (event_id);

create trigger set_rsvp_responses_updated_at
  before update on public.rsvp_responses
  for each row execute function public.set_updated_at();

create table public.custom_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  question_text_ar text not null,
  question_text_en text,
  type text not null check (
    type in ('short_text', 'long_text', 'yes_no', 'single_choice', 'multi_choice', 'number')
  ),
  is_required boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index custom_questions_event_id_idx on public.custom_questions (event_id);

create table public.custom_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.custom_questions (id) on delete cascade,
  option_text_ar text not null,
  option_text_en text,
  display_order int not null default 0
);

create index custom_question_options_question_id_idx on public.custom_question_options (question_id);

create table public.custom_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.rsvp_responses (id) on delete cascade,
  question_id uuid not null references public.custom_questions (id) on delete cascade,
  answer_value jsonb not null,
  unique (response_id, question_id)
);

create index custom_answers_response_id_idx on public.custom_answers (response_id);

-- RLS -----------------------------------------------------------------------
-- Organizer (org member) access is granted directly below. Guest-facing
-- writes (RSVP submission, edit-by-link) and reads of a single guest's own
-- data are NOT exposed through table policies at all — they are handled
-- exclusively by the SECURITY DEFINER RPC functions in
-- 20260807000008_rpc_public_actions.sql, which validate business rules
-- (event published, RSVP open, deadline, token match) before touching a row.
-- This keeps direct table access anonymous-proof by default.

alter table public.guests enable row level security;
alter table public.rsvp_responses enable row level security;
alter table public.custom_questions enable row level security;
alter table public.custom_question_options enable row level security;
alter table public.custom_answers enable row level security;

create policy "guests_manage_members"
  on public.guests for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "rsvp_responses_manage_members"
  on public.rsvp_responses for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "custom_questions_manage_members"
  on public.custom_questions for all
  to authenticated
  using (public.is_org_member((select organization_id from public.events e where e.id = event_id)))
  with check (public.is_org_member((select organization_id from public.events e where e.id = event_id)));

create policy "custom_questions_select_public"
  on public.custom_questions for select
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

create policy "custom_question_options_manage_members"
  on public.custom_question_options for all
  to authenticated
  using (
    public.is_org_member((
      select e.organization_id
      from public.custom_questions q
      join public.events e on e.id = q.event_id
      where q.id = question_id
    ))
  )
  with check (
    public.is_org_member((
      select e.organization_id
      from public.custom_questions q
      join public.events e on e.id = q.event_id
      where q.id = question_id
    ))
  );

create policy "custom_question_options_select_public"
  on public.custom_question_options for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.custom_questions q
      join public.events e on e.id = q.event_id
      where q.id = question_id
        and e.visibility = 'public'
        and e.status = 'published'
        and e.deleted_at is null
    )
  );

create policy "custom_answers_manage_members"
  on public.custom_answers for all
  to authenticated
  using (
    public.is_org_member((
      select e.organization_id
      from public.rsvp_responses r
      join public.events e on e.id = r.event_id
      where r.id = response_id
    ))
  )
  with check (
    public.is_org_member((
      select e.organization_id
      from public.rsvp_responses r
      join public.events e on e.id = r.event_id
      where r.id = response_id
    ))
  );
