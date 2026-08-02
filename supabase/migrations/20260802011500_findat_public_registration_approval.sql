-- FINDAT public-registration approval upgrade
-- Run this once in Supabase Dashboard -> SQL Editor.
-- Existing active accounts remain unchanged. New public registrations start inactive
-- until an Administrator activates/confirms them from User Accounts.

alter table public.findat_profiles
  alter column active set default false;

create or replace function public.findat_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_role public.findat_role := 'client';
begin
  v_username := public.findat_normalise_username(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1)),
    new.id
  );

  if exists (
    select 1 from public.findat_profiles p
    where lower(p.username) = lower(v_username) and p.id <> new.id
  ) then
    v_username := left(v_username, 20) || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  -- Only trusted server/Admin-created accounts carry findat_role in app metadata.
  if new.raw_app_meta_data ->> 'findat_role' in ('admin', 'consultant', 'client') then
    v_role := (new.raw_app_meta_data ->> 'findat_role')::public.findat_role;
  end if;

  insert into public.findat_profiles (
    id, username, email, first_name, last_name, phone, organisation, country, role, active
  ) values (
    new.id,
    v_username,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'organisation', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    v_role,
    case
      when new.raw_app_meta_data ->> 'findat_role' in ('admin', 'consultant', 'client') then true
      else false
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    organisation = excluded.organisation,
    country = excluded.country,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists findat_on_auth_user_created on auth.users;
create trigger findat_on_auth_user_created
  after insert or update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.findat_handle_new_auth_user();

select 'FINDAT public registration approval is enabled' as result;
