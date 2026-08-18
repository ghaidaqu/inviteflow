-- Demo data for local development ------------------------------------------
-- Run with `supabase db reset` (applies migrations then this file) against a
-- local `supabase start` instance. Inserts a demo auth user directly into
-- auth.users, which only works against a local Supabase/GoTrue instance —
-- never run this against a hosted project. For a hosted project, sign up
-- normally through /register instead and adapt the owner id below.

do $$
declare
  v_owner_id uuid := '11111111-1111-1111-1111-111111111111';
  v_org_id uuid;
  v_wedding_id uuid;
  v_conference_id uuid;
  v_guest1_id uuid;
  v_guest2_id uuid;
  v_response1_id uuid;
  v_ticket_type_id uuid;
begin
  -- Demo organizer account: demo@inviteflow.app / password123
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    v_owner_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@inviteflow.app',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Organizer","preferred_locale":"ar"}',
    now(),
    now()
  )
  on conflict (id) do nothing;

  update public.profiles
  set full_name = 'Demo Organizer', preferred_locale = 'ar'
  where id = v_owner_id;

  -- Organization ------------------------------------------------------------
  insert into public.organizations (owner_id, name, slug)
  values (v_owner_id, 'InviteFlow Demo', 'inviteflow-demo')
  on conflict (slug) do nothing
  returning id into v_org_id;

  if v_org_id is null then
    select id into v_org_id from public.organizations where slug = 'inviteflow-demo';
  end if;

  -- Event 1: published wedding with RSVP + custom questions -----------------
  insert into public.events (
    organization_id, created_by, slug, name, type, description,
    event_date, rsvp_deadline, location_text, location_map_url,
    primary_locale, visibility, is_rsvp_enabled, is_ticketing_enabled, is_qr_enabled, status
  )
  values (
    v_org_id, v_owner_id, 'sara-ahmad-wedding', 'زفاف سارة وأحمد', 'wedding',
    'يسعدنا دعوتكم لحضور حفل زفافنا.',
    now() + interval '30 days', now() + interval '20 days',
    'قاعة الأفراح الكبرى، الرياض', 'https://maps.google.com/?q=Riyadh',
    'ar', 'public', true, false, false, 'published'
  )
  on conflict (slug) do nothing
  returning id into v_wedding_id;

  if v_wedding_id is null then
    select id into v_wedding_id from public.events where slug = 'sara-ahmad-wedding';
  end if;

  insert into public.custom_questions (event_id, question_text_ar, question_text_en, type, is_required, display_order)
  values (v_wedding_id, 'هل لديك أي قيود غذائية؟', 'Any dietary restrictions?', 'short_text', false, 1)
  on conflict do nothing;

  -- Demo guests + RSVP responses on the wedding event ------------------------
  insert into public.guests (event_id, name, phone)
  values (v_wedding_id, 'خالد العتيبي', '0500000001')
  returning id into v_guest1_id;

  insert into public.rsvp_responses (event_id, guest_id, status, companions_count, companions_names, message)
  values (v_wedding_id, v_guest1_id, 'attending', 1, '["نورة العتيبي"]'::jsonb, 'بالتوفيق!')
  returning id into v_response1_id;

  insert into public.guests (event_id, name, phone)
  values (v_wedding_id, 'منى الدوسري', '0500000002')
  returning id into v_guest2_id;

  insert into public.rsvp_responses (event_id, guest_id, status, companions_count)
  values (v_wedding_id, v_guest2_id, 'not_attending', 0);

  -- Event 2: published conference with ticketing -----------------------------
  insert into public.events (
    organization_id, created_by, slug, name, type, description,
    event_date, location_text, primary_locale, visibility,
    is_rsvp_enabled, is_ticketing_enabled, is_qr_enabled, status
  )
  values (
    v_org_id, v_owner_id, 'tech-conference-2026', 'مؤتمر التقنية 2026', 'conference',
    'مؤتمر سنوي يجمع خبراء التقنية.',
    now() + interval '60 days', 'مركز المؤتمرات، جدة',
    'ar', 'public', false, true, true, 'published'
  )
  on conflict (slug) do nothing
  returning id into v_conference_id;

  if v_conference_id is null then
    select id into v_conference_id from public.events where slug = 'tech-conference-2026';
  end if;

  insert into public.ticket_types (event_id, name_ar, name_en, price, currency, quantity_total, max_per_order)
  values (v_conference_id, 'تذكرة عامة', 'General Admission', 150, 'SAR', 200, 4)
  on conflict do nothing
  returning id into v_ticket_type_id;

  if v_ticket_type_id is null then
    select id into v_ticket_type_id from public.ticket_types where event_id = v_conference_id limit 1;
  end if;

  -- Sell a couple of demo tickets via the same mock-purchase path the app uses.
  perform public.purchase_tickets_mock(
    'tech-conference-2026', v_ticket_type_id, 2, 'فيصل المطيري', 'faisal@example.com', '0500000003'
  );

  -- Event 3: draft event (not yet published) ---------------------------------
  insert into public.events (
    organization_id, created_by, slug, name, type, primary_locale, visibility, status
  )
  values (
    v_org_id, v_owner_id, 'graduation-2026-draft', 'حفل تخرج 2026', 'graduation', 'ar', 'private', 'draft'
  )
  on conflict (slug) do nothing;
end $$;
