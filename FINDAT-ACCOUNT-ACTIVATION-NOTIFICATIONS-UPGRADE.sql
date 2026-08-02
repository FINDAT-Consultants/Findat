-- Compatibility filename retained. The former Administrator-approval workflow has been superseded.
-- FINDAT automatic public Client registration upgrade
-- Run in Supabase Dashboard -> SQL Editor after the existing Auth/RBAC migrations.
-- Public email/password and Google Client registrations become active immediately.
-- Administrator notifications remain informational; no approval action is required.

begin;

alter table public.findat_profiles
  alter column active set default true;

create unique index if not exists findat_account_registration_notification_unique_idx
  on public.findat_notifications (recipient_id, title)
  where title like 'account_registered:%';

create or replace function public.findat_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_role public.findat_role := 'client';
  v_existing_role public.findat_role;
  v_display_name text;
begin
  select p.role
    into v_existing_role
  from public.findat_profiles p
  where p.id = new.id;

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

  -- Only trusted server/Admin-created accounts can request elevated roles.
  if new.raw_app_meta_data ->> 'findat_role' in ('admin', 'consultant', 'client') then
    v_role := (new.raw_app_meta_data ->> 'findat_role')::public.findat_role;
  elsif v_existing_role is not null then
    v_role := v_existing_role;
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
    true
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

  -- Inform active Administrators about new public Client registrations.
  if tg_op = 'INSERT'
     and coalesce(new.raw_app_meta_data ->> 'findat_role', '') = '' then
    v_display_name := nullif(trim(concat_ws(
      ' ',
      coalesce(new.raw_user_meta_data ->> 'first_name', ''),
      coalesce(new.raw_user_meta_data ->> 'last_name', '')
    )), '');

    insert into public.findat_notifications (
      recipient_id,
      actor_id,
      kind,
      title,
      message,
      action_state,
      is_read
    )
    select
      administrator.id,
      new.id,
      'system',
      'account_registered:' || new.id::text,
      format(
        'New Client registered: %s (@%s). The account was activated automatically and can use FINDAT immediately.',
        coalesce(v_display_name, v_username),
        v_username
      ),
      'none',
      false
    from public.findat_profiles administrator
    where administrator.role = 'admin'
      and administrator.active = true
    on conflict (recipient_id, title)
      where title like 'account_registered:%'
      do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists findat_on_auth_user_created on auth.users;
create trigger findat_on_auth_user_created
  after insert or update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.findat_handle_new_auth_user();

-- Activate public Client accounts that were left pending by the previous approval workflow.
-- Trusted Admin-created suspended accounts are not changed.
update public.findat_profiles p
set active = true,
    updated_at = now()
from auth.users u
where u.id = p.id
  and p.role = 'client'
  and p.active = false
  and coalesce(u.raw_app_meta_data ->> 'findat_role', '') = '';

-- Convert old pending approval alerts into normal informational history.
update public.findat_notifications n
set action_state = 'accepted',
    message = regexp_replace(
      n.message,
      '^Account approval required:',
      'Client account activated automatically:'
    ),
    updated_at = now()
where n.kind = 'system'
  and n.action_state = 'pending'
  and n.title like 'account_approval:%';

-- Preserve only unanswered collaboration requests when clearing notification history.
create or replace function public.findat_clear_notification_history()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  update public.findat_notifications n
  set cleared_at = now(),
      is_read = true,
      read_at = coalesce(n.read_at, now()),
      updated_at = now()
  where n.recipient_id = auth.uid()
    and n.cleared_at is null
    and not (
      n.kind = 'collaboration_request'
      and n.action_state = 'pending'
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.findat_clear_notification_history() from public, anon;
grant execute on function public.findat_clear_notification_history() to authenticated;

commit;

select 'FINDAT public Client accounts now activate automatically' as result;
