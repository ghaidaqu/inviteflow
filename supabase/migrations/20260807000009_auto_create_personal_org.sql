-- Every new organizer gets a personal organization automatically, so the
-- MVP never needs a separate "create your organization" onboarding step.
-- (organization_members gets its 'owner' row via the existing
-- on_organization_created trigger from 20260807000003_organizations.sql.)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, full_name, avatar_url, preferred_locale)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'preferred_locale', 'ar')
  );

  insert into public.organizations (owner_id, name, slug)
  values (new.id, v_full_name, 'org-' || replace(new.id::text, '-', ''));

  return new;
end;
$$;
