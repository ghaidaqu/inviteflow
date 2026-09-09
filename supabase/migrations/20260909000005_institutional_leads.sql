-- Enterprise enquiries had nowhere to go.
--
-- submitInstitutionalLeadAction emailed the lead and stored nothing. Its
-- comment argued a table was overkill for "a handful of leads while the
-- feature doesn't exist yet" — reasonable, except RESEND_API_KEY is not
-- set in production, so emailProvider falls back to the console provider.
-- Every enquiry was written to a Railway log line and lost, while the
-- visitor was told "استلمنا طلبك، وسنتواصل معك".
--
-- A promise to follow up has to survive a missing API key.
create table public.institutional_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text not null,
  email text not null,
  phone text,
  message text,
  -- Whether the notification email actually went out, so an unset mail
  -- provider is visible rather than silent.
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index institutional_leads_created_idx on public.institutional_leads (created_at desc);

alter table public.institutional_leads enable row level security;

-- No policy at all: nobody reads this through the API. The form writes it
-- with the service role, and it is read from the Supabase dashboard. RLS
-- with zero policies denies everything, which is exactly right for a table
-- holding names, emails and phone numbers of prospective customers.
