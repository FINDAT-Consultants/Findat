-- FINDAT Google authentication profile upgrade
-- Run after the existing FINDAT Auth/RBAC and profile migrations.

begin;

alter table public.findat_profiles
  add column if not exists avatar_url text not null default '';

create or replace function public.findat_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_existing_username text;
  v_existing_role public.findat_role;
  v_role public.findat_role := 'client'::public.findat_role;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_avatar_url text;
begin
  select p.username, p.role
    into v_existing_username, v_existing_role
  from public.findat_profiles as p
  where p.id = new.id;

  v_username := coalesce(
    nullif(trim(v_existing_username), ''),
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  v_username := public.findat_normalise_username(v_username, new.id);

  if exists (
    select 1
    from public.findat_profiles as p
    where lower(p.username) = lower(v_username)
      and p.id <> new.id
  ) then
    v_username := left(v_username, 20) || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  if new.raw_app_meta_data ->> 'findat_role' in ('admin', 'consultant', 'client') then
    v_role := (new.raw_app_meta_data ->> 'findat_role')::public.findat_role;
  elsif v_existing_role is not null then
    v_role := v_existing_role;
  end if;

  v_full_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    ''
  ));

  v_first_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'given_name', ''),
    nullif(split_part(v_full_name, ' ', 1), ''),
    ''
  ));

  v_last_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'family_name', ''),
    case
      when position(' ' in v_full_name) > 0
        then substr(v_full_name, position(' ' in v_full_name) + 1)
      else ''
    end,
    ''
  ));

  v_avatar_url := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', ''),
    ''
  ));

  insert into public.findat_profiles (
    id,
    username,
    email,
    first_name,
    last_name,
    phone,
    organisation,
    country,
    role,
    active,
    avatar_url
  ) values (
    new.id,
    v_username,
    lower(coalesce(new.email, '')),
    v_first_name,
    v_last_name,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'organisation', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    v_role,
    true,
    v_avatar_url
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = case
      when nullif(public.findat_profiles.first_name, '') is null then excluded.first_name
      else public.findat_profiles.first_name
    end,
    last_name = case
      when nullif(public.findat_profiles.last_name, '') is null then excluded.last_name
      else public.findat_profiles.last_name
    end,
    avatar_url = case
      when nullif(public.findat_profiles.avatar_url, '') is null then excluded.avatar_url
      else public.findat_profiles.avatar_url
    end,
    role = v_role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists findat_on_auth_user_created on auth.users;
create trigger findat_on_auth_user_created
  after insert or update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.findat_handle_new_auth_user();

-- Backfill missing Google names and profile pictures without replacing details
-- already edited by the FINDAT user.
update public.findat_profiles as p
set
  first_name = case
    when nullif(p.first_name, '') is null then trim(coalesce(
      nullif(u.raw_user_meta_data ->> 'first_name', ''),
      nullif(u.raw_user_meta_data ->> 'given_name', ''),
      nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), ' ', 1), ''),
      ''
    ))
    else p.first_name
  end,
  last_name = case
    when nullif(p.last_name, '') is null then trim(coalesce(
      nullif(u.raw_user_meta_data ->> 'last_name', ''),
      nullif(u.raw_user_meta_data ->> 'family_name', ''),
      case
        when position(' ' in coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')) > 0
          then substr(
            coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
            position(' ' in coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')) + 1
          )
        else ''
      end,
      ''
    ))
    else p.last_name
  end,
  avatar_url = case
    when nullif(p.avatar_url, '') is null then trim(coalesce(
      nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(u.raw_user_meta_data ->> 'picture', ''),
      ''
    ))
    else p.avatar_url
  end,
  updated_at = now()
from auth.users as u
where u.id = p.id;

commit;
