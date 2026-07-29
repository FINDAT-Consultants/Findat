-- FINDAT administrator analytics, cloud workstations and controlled developer studio
-- Run after all earlier FINDAT migrations.

begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Richer audit fields (existing inserts remain compatible)
-- ---------------------------------------------------------------------------
alter table public.findat_audit_log add column if not exists page_path text;
alter table public.findat_audit_log add column if not exists entity_type text;
alter table public.findat_audit_log add column if not exists entity_id text;
alter table public.findat_audit_log add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.findat_audit_log add column if not exists session_id text;
alter table public.findat_audit_log add column if not exists country_signal text;

create index if not exists findat_audit_log_actor_time_idx
  on public.findat_audit_log(actor_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Visitor and user activity telemetry
-- This stores first-party application events only. It does not capture precise
-- GPS location or browser content outside FINDAT.
-- ---------------------------------------------------------------------------
create table if not exists public.findat_platform_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  visitor_id text not null,
  actor_id uuid references public.findat_profiles(id) on delete set null,
  actor_name text not null default 'Visitor',
  actor_role public.findat_role,
  event_type text not null,
  page_path text not null default '',
  page_title text not null default '',
  entity_type text not null default '',
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  referrer text not null default '',
  timezone text not null default '',
  language text not null default '',
  country_signal text not null default '',
  exit_reason text not null default ''
);

create index if not exists findat_platform_events_time_idx
  on public.findat_platform_events(occurred_at desc);
create index if not exists findat_platform_events_actor_idx
  on public.findat_platform_events(actor_id, occurred_at desc);
create index if not exists findat_platform_events_type_idx
  on public.findat_platform_events(event_type, occurred_at desc);
create index if not exists findat_platform_events_visitor_idx
  on public.findat_platform_events(visitor_id, occurred_at desc);

alter table public.findat_platform_events enable row level security;

drop policy if exists "FINDAT admin platform events select" on public.findat_platform_events;
create policy "FINDAT admin platform events select"
  on public.findat_platform_events for select to authenticated
  using (public.findat_is_admin());

create or replace function public.findat_track_platform_event(
  p_event_type text,
  p_page_path text default '',
  p_page_title text default '',
  p_entity_type text default '',
  p_entity_id text default null,
  p_detail jsonb default '{}'::jsonb,
  p_visitor_id text default '',
  p_referrer text default '',
  p_timezone text default '',
  p_language text default '',
  p_exit_reason text default ''
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_actor_id uuid := auth.uid();
  v_actor_name text := 'Visitor';
  v_actor_role public.findat_role;
  v_country text := '';
begin
  if trim(coalesce(p_event_type, '')) = '' then
    raise exception 'Event type is required';
  end if;

  if v_actor_id is not null then
    select
      coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'FINDAT Member'),
      p.role,
      coalesce(p.country, '')
    into v_actor_name, v_actor_role, v_country
    from public.findat_profiles p
    where p.id = v_actor_id
    limit 1;
  end if;

  insert into public.findat_platform_events(
    visitor_id, actor_id, actor_name, actor_role, event_type,
    page_path, page_title, entity_type, entity_id, detail,
    referrer, timezone, language, country_signal, exit_reason
  ) values (
    left(coalesce(nullif(trim(p_visitor_id), ''), 'visitor-unknown'), 160),
    v_actor_id,
    left(coalesce(v_actor_name, 'Visitor'), 200),
    v_actor_role,
    left(trim(p_event_type), 80),
    left(coalesce(p_page_path, ''), 240),
    left(coalesce(p_page_title, ''), 180),
    left(coalesce(p_entity_type, ''), 80),
    nullif(left(coalesce(p_entity_id, ''), 120), ''),
    coalesce(p_detail, '{}'::jsonb),
    left(coalesce(p_referrer, ''), 500),
    left(coalesce(p_timezone, ''), 100),
    left(coalesce(p_language, ''), 40),
    left(coalesce(nullif(v_country, ''), nullif(p_timezone, ''), nullif(p_language, ''), 'Unknown'), 120),
    left(coalesce(p_exit_reason, ''), 120)
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on public.findat_platform_events from public, anon, authenticated;
grant select on public.findat_platform_events to authenticated;
revoke all on function public.findat_track_platform_event(text,text,text,text,text,jsonb,text,text,text,text,text) from public;
grant execute on function public.findat_track_platform_event(text,text,text,text,text,jsonb,text,text,text,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Administrator-managed Cloud workstations
-- Password hashes never leave Postgres. Browser users access them through RPCs.
-- ---------------------------------------------------------------------------
create table if not exists public.findat_cloud_workstations (
  id uuid primary key default gen_random_uuid(),
  workstation_no integer not null unique check (workstation_no between 1 and 24),
  name text not null,
  assigned_user_id uuid not null references public.findat_profiles(id) on delete cascade,
  password_hash text not null,
  active boolean not null default true,
  created_by uuid references public.findat_profiles(id) on delete set null,
  updated_by uuid references public.findat_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists findat_cloud_workstations_user_idx
  on public.findat_cloud_workstations(assigned_user_id, workstation_no);

alter table public.findat_cloud_workstations enable row level security;

create or replace function public.findat_admin_list_workstations()
returns table(
  id uuid,
  workstation_no integer,
  name text,
  assigned_user_id uuid,
  assigned_name text,
  assigned_username text,
  active boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  return query
  select w.id, w.workstation_no, w.name, w.assigned_user_id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username),
    p.username, w.active, w.updated_at
  from public.findat_cloud_workstations w
  join public.findat_profiles p on p.id = w.assigned_user_id
  order by w.workstation_no;
end;
$$;

create or replace function public.findat_admin_save_workstation(
  p_user_id uuid,
  p_workstation_no integer,
  p_name text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  if p_workstation_no is null or p_workstation_no not between 1 and 24 then raise exception 'Workstation number must be between 1 and 24'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Workstation password must contain at least 8 characters'; end if;
  if not exists (select 1 from public.findat_profiles p where p.id = p_user_id and p.active = true) then raise exception 'Choose an active FINDAT account'; end if;

  insert into public.findat_cloud_workstations(
    workstation_no, name, assigned_user_id, password_hash, active,
    created_by, updated_by, updated_at
  ) values (
    p_workstation_no,
    left(coalesce(nullif(trim(p_name), ''), 'Work Station No.' || p_workstation_no::text), 100),
    p_user_id,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    true,
    auth.uid(), auth.uid(), now()
  )
  on conflict (workstation_no) do update set
    name = excluded.name,
    assigned_user_id = excluded.assigned_user_id,
    password_hash = excluded.password_hash,
    active = true,
    updated_by = auth.uid(),
    updated_at = now()
  returning public.findat_cloud_workstations.id into v_id;

  perform public.findat_write_audit(
    'Cloud workstation assigned',
    'Work Station No.' || p_workstation_no::text || ' assigned to account ' || p_user_id::text,
    null
  );
  return v_id;
end;
$$;

create or replace function public.findat_admin_delete_workstation(p_workstation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number integer;
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  delete from public.findat_cloud_workstations
  where id = p_workstation_id
  returning workstation_no into v_number;
  if v_number is null then return false; end if;
  perform public.findat_write_audit('Cloud workstation removed', 'Work Station No.' || v_number::text || ' removed', null);
  return true;
end;
$$;

create or replace function public.findat_my_workstations()
returns table(id uuid, workstation_no integer, name text, active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.workstation_no, w.name, w.active
  from public.findat_cloud_workstations w
  where w.active = true
    and (w.assigned_user_id = auth.uid() or public.findat_is_admin())
  order by w.workstation_no
$$;

create or replace function public.findat_verify_workstation_password(
  p_workstation_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_allowed boolean;
begin
  select w.password_hash,
    (w.active and (w.assigned_user_id = auth.uid() or public.findat_is_admin()))
  into v_hash, v_allowed
  from public.findat_cloud_workstations w
  where w.id = p_workstation_id;

  if not coalesce(v_allowed, false) or v_hash is null then return false; end if;
  return v_hash = extensions.crypt(coalesce(p_password, ''), v_hash);
end;
$$;

revoke all on public.findat_cloud_workstations from public, anon, authenticated;
revoke all on function public.findat_admin_list_workstations() from public;
revoke all on function public.findat_admin_save_workstation(uuid,integer,text,text) from public;
revoke all on function public.findat_admin_delete_workstation(uuid) from public;
revoke all on function public.findat_my_workstations() from public;
revoke all on function public.findat_verify_workstation_password(uuid,text) from public;
grant execute on function public.findat_admin_list_workstations() to authenticated;
grant execute on function public.findat_admin_save_workstation(uuid,integer,text,text) to authenticated;
grant execute on function public.findat_admin_delete_workstation(uuid) to authenticated;
grant execute on function public.findat_my_workstations() to authenticated;
grant execute on function public.findat_verify_workstation_password(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Controlled live Developer Studio source patches
-- ---------------------------------------------------------------------------
create table if not exists public.findat_site_patches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  language text not null check (language in ('html','css','javascript','python','java')),
  code text not null default '',
  active boolean not null default true,
  updated_by uuid references public.findat_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, language)
);

alter table public.findat_site_patches enable row level security;

drop policy if exists "FINDAT public active live patches" on public.findat_site_patches;
create policy "FINDAT public active live patches"
  on public.findat_site_patches for select to anon, authenticated
  using (
    (active = true and language in ('html','css','javascript'))
    or public.findat_is_admin()
  );

create or replace function public.findat_admin_save_site_patch(
  p_name text,
  p_language text,
  p_code text,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_language text := lower(trim(coalesce(p_language, '')));
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  if v_language not in ('html','css','javascript','python','java') then raise exception 'Unsupported source language'; end if;
  if trim(coalesce(p_name, '')) = '' then raise exception 'Patch name is required'; end if;
  if length(coalesce(p_code, '')) > 1000000 then raise exception 'Source patch is too large'; end if;

  insert into public.findat_site_patches(name, language, code, active, updated_by, updated_at)
  values (left(trim(p_name), 80), v_language, coalesce(p_code, ''), coalesce(p_active, true), auth.uid(), now())
  on conflict (name, language) do update set
    code = excluded.code,
    active = excluded.active,
    updated_by = auth.uid(),
    updated_at = now()
  returning id into v_id;

  perform public.findat_write_audit(
    'Developer source patch saved',
    left(trim(p_name), 80) || ' (' || v_language || ')',
    null
  );
  return v_id;
end;
$$;

revoke all on public.findat_site_patches from public, anon, authenticated;
grant select on public.findat_site_patches to anon, authenticated;
revoke all on function public.findat_admin_save_site_patch(text,text,text,boolean) from public;
grant execute on function public.findat_admin_save_site_patch(text,text,text,boolean) to authenticated;

-- Realtime updates for live patches.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'findat_site_patches'
     ) then
    alter publication supabase_realtime add table public.findat_site_patches;
  end if;
end $$;

commit;
