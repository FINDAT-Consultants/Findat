-- FINDAT Consultants — Supabase Auth, Postgres profiles, article workflow and RBAC
-- Run this entire file in Supabase SQL Editor as the project owner.
-- Passwords are NOT stored in public tables. Supabase Auth stores and verifies
-- password hashes inside the protected auth schema.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Application roles
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.findat_role as enum ('admin', 'consultant', 'client');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth.users record
-- ---------------------------------------------------------------------------
create table if not exists public.findat_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  organisation text not null default '',
  country text not null default '',
  role public.findat_role not null default 'client',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_username_format check (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$')
);

create unique index if not exists findat_profiles_username_lower_uq
  on public.findat_profiles (lower(username));
create unique index if not exists findat_profiles_email_lower_uq
  on public.findat_profiles (lower(email));
create index if not exists findat_profiles_role_idx
  on public.findat_profiles (role, active);

create or replace function public.findat_role_for(p_user_id uuid)
returns public.findat_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.findat_profiles p
  where p.id = p_user_id and p.active = true
  limit 1
$$;

create or replace function public.findat_user_is_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.findat_profiles p
    where p.id = p_user_id and p.active = true
  )
$$;

create or replace function public.findat_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.findat_role_for(auth.uid()) = 'admin'::public.findat_role
$$;

create or replace function public.findat_is_consultant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.findat_role_for(auth.uid()) = 'consultant'::public.findat_role
$$;

create or replace function public.findat_normalise_username(p_username text, p_user_id uuid)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
begin
  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    v_username := 'user_' || substr(replace(p_user_id::text, '-', ''), 1, 12);
  end if;
  return v_username;
end;
$$;

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

  -- raw_app_meta_data can only be assigned by a trusted admin/server path.
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

  return new;
end;
$$;

drop trigger if exists findat_on_auth_user_created on auth.users;
create trigger findat_on_auth_user_created
  after insert or update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.findat_handle_new_auth_user();

create or replace function public.findat_guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  if auth.role() = 'service_role' or public.findat_is_admin() then
    return new;
  end if;

  if auth.uid() is null or auth.uid() <> old.id then
    raise exception 'Profile update not permitted';
  end if;

  -- Ordinary users may update personal display details only.
  new.id := old.id;
  new.username := old.username;
  new.email := old.email;
  new.role := old.role;
  new.active := old.active;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists findat_profiles_guard_update on public.findat_profiles;
create trigger findat_profiles_guard_update
  before update on public.findat_profiles
  for each row execute function public.findat_guard_profile_update();

create or replace function public.findat_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    trim(coalesce(candidate, '')) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$'
    and not exists (
      select 1 from public.findat_profiles p
      where lower(p.username) = lower(trim(candidate))
    )
$$;

create or replace function public.findat_consultant_directory()
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  role public.findat_role,
  active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.first_name, p.last_name, p.role, p.active
  from public.findat_profiles p
  where auth.uid() is not null
    and public.findat_is_admin()
    and p.role = 'consultant'::public.findat_role
    and p.active = true
  order by p.first_name, p.last_name, p.username
$$;

-- ---------------------------------------------------------------------------
-- Articles and role-enforced editorial workflow
-- ---------------------------------------------------------------------------
create table if not exists public.findat_articles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.findat_profiles(id) on delete cascade,
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  collaborator_id uuid references public.findat_profiles(id) on delete set null,
  title text not null,
  subtitle text not null default '',
  content text not null,
  template text not null default 'classic',
  category text not null default 'Research',
  image jsonb,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'Draft',
  review_note text,
  author_name text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.findat_profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_article_status_check check (status in ('Draft', 'Pending approval', 'Rejected', 'Published')),
  constraint findat_article_title_check check (char_length(trim(title)) between 1 and 160)
);

create index if not exists findat_articles_owner_idx on public.findat_articles(owner_id, updated_at desc);
create index if not exists findat_articles_collaborator_idx on public.findat_articles(collaborator_id, updated_at desc);
create index if not exists findat_articles_status_idx on public.findat_articles(status, published_at desc);

create or replace function public.findat_profile_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'FINDAT Member')
  from public.findat_profiles p
  where p.id = p_user_id
$$;

create or replace function public.findat_validate_consultant(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is null or exists (
    select 1 from public.findat_profiles p
    where p.id = p_user_id
      and p.role = 'consultant'::public.findat_role
      and p.active = true
  )
$$;

create or replace function public.findat_guard_article_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.findat_role := public.findat_role_for(auth.uid());
  v_owner_role public.findat_role;
begin
  if auth.role() = 'service_role' then
    new.updated_at := now();
    new.author_name := coalesce(public.findat_profile_display_name(new.owner_id), new.author_name, 'FINDAT Member');
    return new;
  end if;

  if v_uid is null or v_role is null then
    raise exception 'Authentication required';
  end if;

  if not public.findat_validate_consultant(new.collaborator_id) then
    raise exception 'The collaborator must be an active Consultant account';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.owner_id := coalesce(new.owner_id, v_uid);
    new.created_by := coalesce(new.created_by, v_uid);

    if v_role = 'consultant' then
      raise exception 'Consultants can edit assigned client articles but cannot create articles';
    elsif v_role = 'client' then
      if new.owner_id <> v_uid or new.created_by <> v_uid then
        raise exception 'Clients may create only their own articles';
      end if;
      if new.status not in ('Draft', 'Pending approval') then
        raise exception 'Clients cannot approve or publish articles';
      end if;
      -- Client accounts write article text only. Assignment and media are
      -- controlled by the Administrator/assigned Consultant workflow.
      new.collaborator_id := null;
      new.image := null;
      new.attachments := '[]'::jsonb;
      new.review_note := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.published_at := null;
    end if;
  else
    new.updated_at := now();

    if v_role = 'client' then
      if old.owner_id <> v_uid then
        raise exception 'Clients may edit only their own articles';
      end if;
      if old.status = 'Published' then
        raise exception 'Published articles may be changed only by an Administrator';
      end if;
      new.owner_id := old.owner_id;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
      new.collaborator_id := old.collaborator_id;
      new.image := old.image;
      new.attachments := old.attachments;
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.published_at := old.published_at;
      if new.status not in ('Draft', 'Pending approval') then
        raise exception 'Clients cannot approve or publish articles';
      end if;
      if new.status = 'Pending approval' then
        new.submitted_at := coalesce(new.submitted_at, now());
        new.review_note := null;
      end if;

    elsif v_role = 'consultant' then
      select p.role into v_owner_role from public.findat_profiles p where p.id = old.owner_id;
      if old.collaborator_id <> v_uid or v_owner_role <> 'client'::public.findat_role then
        raise exception 'Consultants may edit only client articles assigned to them';
      end if;
      if old.status = 'Published' then
        raise exception 'Published articles may be changed only by an Administrator';
      end if;
      new.owner_id := old.owner_id;
      new.created_by := old.created_by;
      new.collaborator_id := old.collaborator_id;
      new.created_at := old.created_at;
      new.status := old.status;
      new.submitted_at := old.submitted_at;
      new.review_note := old.review_note;
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.published_at := old.published_at;
    end if;
  end if;

  new.author_name := coalesce(public.findat_profile_display_name(new.owner_id), new.author_name, 'FINDAT Member');
  return new;
end;
$$;

drop trigger if exists findat_articles_guard_write on public.findat_articles;
create trigger findat_articles_guard_write
  before insert or update on public.findat_articles
  for each row execute function public.findat_guard_article_write();

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.findat_audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.findat_profiles(id) on delete set null,
  actor_name text not null default 'System',
  actor_role public.findat_role,
  action text not null,
  detail text not null default '',
  article_id uuid references public.findat_articles(id) on delete set null
);
create index if not exists findat_audit_log_occurred_idx on public.findat_audit_log(occurred_at desc);
create index if not exists findat_audit_log_article_idx on public.findat_audit_log(article_id);

create or replace function public.findat_write_audit(
  p_action text,
  p_detail text default '',
  p_article_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_role public.findat_role := public.findat_role_for(auth.uid());
begin
  if auth.uid() is null or v_role is null then
    raise exception 'Authentication required';
  end if;
  insert into public.findat_audit_log(actor_id, actor_name, actor_role, action, detail, article_id)
  values (
    auth.uid(),
    coalesce(public.findat_profile_display_name(auth.uid()), 'FINDAT Member'),
    v_role,
    left(coalesce(p_action, ''), 200),
    left(coalesce(p_detail, ''), 2000),
    p_article_id
  ) returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.findat_profiles enable row level security;
alter table public.findat_articles enable row level security;
alter table public.findat_audit_log enable row level security;

-- Profiles
 drop policy if exists "FINDAT profiles self select" on public.findat_profiles;
create policy "FINDAT profiles self select"
  on public.findat_profiles for select to authenticated
  using (id = auth.uid());

 drop policy if exists "FINDAT profiles admin select" on public.findat_profiles;
create policy "FINDAT profiles admin select"
  on public.findat_profiles for select to authenticated
  using (public.findat_is_admin());

 drop policy if exists "FINDAT profiles self update" on public.findat_profiles;
create policy "FINDAT profiles self update"
  on public.findat_profiles for update to authenticated
  using (id = auth.uid() and public.findat_user_is_active(auth.uid()))
  with check (id = auth.uid());

-- Articles
 drop policy if exists "FINDAT public published articles" on public.findat_articles;
create policy "FINDAT public published articles"
  on public.findat_articles for select to anon
  using (status = 'Published');

 drop policy if exists "FINDAT authenticated article select" on public.findat_articles;
create policy "FINDAT authenticated article select"
  on public.findat_articles for select to authenticated
  using (
    public.findat_user_is_active(auth.uid())
    and (
      status = 'Published'
      or public.findat_is_admin()
      or owner_id = auth.uid()
      or (public.findat_is_consultant() and collaborator_id = auth.uid())
    )
  );

 drop policy if exists "FINDAT article insert" on public.findat_articles;
create policy "FINDAT article insert"
  on public.findat_articles for insert to authenticated
  with check (
    public.findat_user_is_active(auth.uid())
    and (
      public.findat_is_admin()
      or (
        public.findat_role_for(auth.uid()) = 'client'::public.findat_role
        and owner_id = auth.uid()
        and created_by = auth.uid()
      )
    )
  );

 drop policy if exists "FINDAT article update" on public.findat_articles;
create policy "FINDAT article update"
  on public.findat_articles for update to authenticated
  using (
    public.findat_user_is_active(auth.uid())
    and (
      public.findat_is_admin()
      or owner_id = auth.uid()
      or (public.findat_is_consultant() and collaborator_id = auth.uid())
    )
  )
  with check (
    public.findat_user_is_active(auth.uid())
    and (
      public.findat_is_admin()
      or owner_id = auth.uid()
      or (public.findat_is_consultant() and collaborator_id = auth.uid())
    )
  );

 drop policy if exists "FINDAT article delete" on public.findat_articles;
create policy "FINDAT article delete"
  on public.findat_articles for delete to authenticated
  using (
    public.findat_user_is_active(auth.uid())
    and public.findat_is_admin()
  );

-- Audit log: administrators can read it; authenticated users write only through RPC.
 drop policy if exists "FINDAT admin audit select" on public.findat_audit_log;
create policy "FINDAT admin audit select"
  on public.findat_audit_log for select to authenticated
  using (public.findat_is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.findat_profiles from anon;
revoke all on public.findat_articles from anon, authenticated;
revoke all on public.findat_audit_log from anon, authenticated;

grant select on public.findat_articles to anon, authenticated;
grant insert, update, delete on public.findat_articles to authenticated;
grant select, update on public.findat_profiles to authenticated;
grant select on public.findat_audit_log to authenticated;

grant execute on function public.findat_username_available(text) to anon, authenticated;
grant execute on function public.findat_consultant_directory() to authenticated;
grant execute on function public.findat_write_audit(text, text, uuid) to authenticated;

-- Helper functions are used by RLS but should not be called by anonymous users directly.
revoke all on function public.findat_role_for(uuid) from public, anon;
revoke all on function public.findat_user_is_active(uuid) from public, anon;
revoke all on function public.findat_is_admin() from public, anon;
revoke all on function public.findat_is_consultant() from public, anon;
revoke all on function public.findat_profile_display_name(uuid) from public, anon;
revoke all on function public.findat_validate_consultant(uuid) from public, anon;

grant execute on function public.findat_role_for(uuid) to authenticated;
grant execute on function public.findat_user_is_active(uuid) to authenticated;
grant execute on function public.findat_is_admin() to authenticated;
grant execute on function public.findat_is_consultant() to authenticated;
grant execute on function public.findat_profile_display_name(uuid) to authenticated;
grant execute on function public.findat_validate_consultant(uuid) to authenticated;
grant usage on type public.findat_role to anon, authenticated;

-- ---------------------------------------------------------------------------
-- SQL-Editor-only helper: promote an existing Auth user to the first Admin.
-- First create the user under Authentication -> Users, then run:
--   select public.findat_promote_existing_user_to_admin(
--     'admin@example.com', 'admin', 'System', 'Administrator'
--   );
-- This function is deliberately not executable through the browser API.
-- ---------------------------------------------------------------------------
create or replace function public.findat_promote_existing_user_to_admin(
  p_email text,
  p_username text,
  p_first_name text default 'System',
  p_last_name text default 'Administrator'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'No Supabase Auth user exists for %', p_email;
  end if;

  if trim(p_username) !~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$' then
    raise exception 'Invalid username format';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('findat_role', 'admin'),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'username', trim(p_username),
        'first_name', coalesce(p_first_name, 'System'),
        'last_name', coalesce(p_last_name, 'Administrator')
      ),
      updated_at = now()
  where id = v_user_id;

  insert into public.findat_profiles(id, username, email, first_name, last_name, role, active)
  values (
    v_user_id,
    trim(p_username),
    lower(trim(p_email)),
    coalesce(p_first_name, 'System'),
    coalesce(p_last_name, 'Administrator'),
    'admin'::public.findat_role,
    true
  )
  on conflict (id) do update set
    username = excluded.username,
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    role = 'admin'::public.findat_role,
    active = true,
    updated_at = now();

  return v_user_id;
end;
$$;

revoke all on function public.findat_promote_existing_user_to_admin(text, text, text, text)
  from public, anon, authenticated;

commit;
