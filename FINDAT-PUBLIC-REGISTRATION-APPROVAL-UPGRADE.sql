-- FINDAT public registration, Administrator notification and approval upgrade
-- Run this in Supabase Dashboard -> SQL Editor after the main FINDAT Auth/RBAC
-- and collaboration-notifications migrations.
--
-- Existing accounts remain unchanged. New public registrations start inactive,
-- every active Administrator receives an in-system notification, and the
-- notification opens User Accounts for review and activation.

begin;

alter table public.findat_profiles
  alter column active set default false;

-- Avoid duplicate approval notices if the migration is reapplied.
create unique index if not exists findat_account_approval_notification_unique_idx
  on public.findat_notifications (recipient_id, title)
  where title like 'account_approval:%';

create or replace function public.findat_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_role public.findat_role := 'client';
  v_is_trusted_account boolean := false;
  v_display_name text;
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
  v_is_trusted_account := new.raw_app_meta_data ->> 'findat_role' in ('admin', 'consultant', 'client');
  if v_is_trusted_account then
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
    v_is_trusted_account
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

  -- Notify every active Administrator once for a new public registration.
  -- Updates to an existing Auth user do not create another notification.
  if tg_op = 'INSERT' and not v_is_trusted_account then
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
      'account_approval:' || new.id::text,
      format(
        'Account approval required: %s (@%s) registered as a Client. Review the submitted details, then approve or reject access.',
        coalesce(v_display_name, v_username),
        v_username
      ),
      'pending',
      false
    from public.findat_profiles administrator
    where administrator.role = 'admin'
      and administrator.active = true
    on conflict (recipient_id, title)
      where title like 'account_approval:%'
      do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists findat_on_auth_user_created on auth.users;
create trigger findat_on_auth_user_created
  after insert or update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.findat_handle_new_auth_user();

-- Pending account approvals remain visible when an Administrator clears normal
-- notification history. They are completed automatically after activation.
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
    )
    and not (
      n.kind = 'system'
      and n.action_state = 'pending'
      and n.title like 'account_approval:%'
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.findat_clear_notification_history() from public, anon;
grant execute on function public.findat_clear_notification_history() to authenticated;

commit;

select 'FINDAT registration approval notifications are enabled' as result;
