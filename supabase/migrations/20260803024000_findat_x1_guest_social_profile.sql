-- FINDAT x1 guest access, professional profile covers and social analytics
-- Run after the existing FINDAT Auth/RBAC, collaboration, profile and Writing Desk migrations.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Professional profile covers
-- -----------------------------------------------------------------------------

alter table public.findat_profiles
  add column if not exists cover_url text not null default '';

create or replace function public.findat_set_profile_cover(p_cover_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := trim(coalesce(p_cover_url, ''));
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  if length(v_url) > 900000 then
    raise exception 'The profile cover is too large';
  end if;

  if v_url <> ''
     and v_url not like 'https://%'
     and v_url not like 'data:image/%;base64,%'
  then
    raise exception 'The profile cover address is invalid';
  end if;

  update public.findat_profiles as p
  set cover_url = v_url,
      updated_at = now()
  where p.id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  return v_url;
end;
$$;

create or replace function public.findat_clear_profile_cover()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  update public.findat_profiles as p
  set cover_url = '',
      updated_at = now()
  where p.id = auth.uid();

  return found;
end;
$$;

-- Return complete active-member profiles for the professional network.
drop function if exists public.findat_collaboration_directory();
create function public.findat_collaboration_directory()
returns table (
  id uuid,
  display_name text,
  first_name text,
  last_name text,
  username text,
  email text,
  phone text,
  organisation text,
  country text,
  role public.findat_role,
  avatar_url text,
  cover_url text,
  qualifications text,
  job_title text,
  place_of_work text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'FINDAT Member'),
    p.first_name,
    p.last_name,
    p.username,
    p.email,
    p.phone,
    p.organisation,
    p.country,
    p.role,
    p.avatar_url,
    p.cover_url,
    p.qualifications,
    p.job_title,
    p.place_of_work,
    p.active,
    p.created_at,
    p.updated_at
  from public.findat_profiles p
  where auth.uid() is not null
    and public.findat_user_is_active(auth.uid())
    and p.active = true
  order by 2
$$;

revoke all on function public.findat_set_profile_cover(text) from public, anon;
revoke all on function public.findat_clear_profile_cover() from public, anon;
revoke all on function public.findat_collaboration_directory() from public, anon;
grant execute on function public.findat_set_profile_cover(text) to authenticated;
grant execute on function public.findat_clear_profile_cover() to authenticated;
grant execute on function public.findat_collaboration_directory() to authenticated;

-- Existing profile Storage policies cover every object below
-- findat-v1/profiles/<authenticated-user-id>/, including cover.jpg.

-- -----------------------------------------------------------------------------
-- 2. Restricted guest x1 usage records
-- -----------------------------------------------------------------------------

create table if not exists public.findat_ai_guest_usage (
  id bigint generated always as identity primary key,
  guest_hash text not null,
  provider text not null default 'openai',
  model text not null default '',
  prompt_chars integer not null default 0,
  response_chars integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  status text not null default 'completed',
  error_code text,
  openai_request_id text,
  created_at timestamptz not null default now(),
  constraint findat_ai_guest_usage_status_check check (status in ('completed', 'failed'))
);

create index if not exists findat_ai_guest_usage_guest_created_idx
  on public.findat_ai_guest_usage (guest_hash, created_at desc);
create index if not exists findat_ai_guest_usage_created_idx
  on public.findat_ai_guest_usage (created_at desc);

alter table public.findat_ai_guest_usage enable row level security;
revoke all on table public.findat_ai_guest_usage from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Writing Desk impressions and professional audience analytics
-- -----------------------------------------------------------------------------

create table if not exists public.findat_article_impressions (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  viewer_id uuid references public.findat_profiles(id) on delete set null,
  viewer_session text not null default '',
  source text not null default 'feed',
  country text not null default '',
  organisation text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists findat_article_impressions_article_created_idx
  on public.findat_article_impressions (article_id, created_at desc);
create index if not exists findat_article_impressions_viewer_created_idx
  on public.findat_article_impressions (viewer_id, created_at desc);

alter table public.findat_article_impressions enable row level security;

-- Raw impression rows are private to the article owner/publisher and Administrators.
drop policy if exists "findat article analytics visible to owners" on public.findat_article_impressions;
create policy "findat article analytics visible to owners"
on public.findat_article_impressions for select
to authenticated
using (
  public.findat_user_is_active(auth.uid())
  and exists (
    select 1
    from public.findat_articles a
    where a.id = article_id
      and (
        a.owner_id = auth.uid()
        or a.created_by = auth.uid()
        or a.publisher_id = auth.uid()
        or public.findat_is_admin()
      )
  )
);

create or replace function public.findat_record_article_impression(
  p_article_id uuid,
  p_session_id text default '',
  p_source text default 'feed'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session text := left(regexp_replace(trim(coalesce(p_session_id, '')), '[^A-Za-z0-9._:-]', '', 'g'), 120);
  v_source text := left(trim(coalesce(p_source, 'feed')), 40);
  v_country text := '';
  v_organisation text := '';
begin
  if v_uid is null or not public.findat_user_is_active(v_uid) then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.findat_articles a
    where a.id = p_article_id
      and (
        a.status = 'Published'
        or public.findat_can_access_article(a.id, v_uid)
      )
  ) then
    raise exception 'Article not available';
  end if;

  select coalesce(p.country, ''), coalesce(p.organisation, '')
    into v_country, v_organisation
  from public.findat_profiles p
  where p.id = v_uid;

  if exists (
    select 1
    from public.findat_article_impressions i
    where i.article_id = p_article_id
      and i.viewer_id = v_uid
      and i.created_at >= now() - interval '30 minutes'
      and (v_session = '' or i.viewer_session = v_session)
  ) then
    return false;
  end if;

  insert into public.findat_article_impressions (
    article_id, viewer_id, viewer_session, source, country, organisation
  ) values (
    p_article_id, v_uid, v_session, coalesce(nullif(v_source, ''), 'feed'),
    left(v_country, 100), left(v_organisation, 180)
  );

  return true;
end;
$$;

create or replace function public.findat_article_analytics(p_article_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_views bigint := 0;
  v_unique bigint := 0;
  v_followers bigint := 0;
  v_regions jsonb := '{}'::jsonb;
  v_companies jsonb := '{}'::jsonb;
  v_daily jsonb := '{}'::jsonb;
  v_follower_regions jsonb := '{}'::jsonb;
  v_follower_companies jsonb := '{}'::jsonb;
begin
  if v_uid is null or not public.findat_user_is_active(v_uid) then
    raise exception 'Authentication required';
  end if;

  select a.owner_id
    into v_owner
  from public.findat_articles a
  where a.id = p_article_id
    and (
      a.owner_id = v_uid
      or a.created_by = v_uid
      or a.publisher_id = v_uid
      or public.findat_is_article_collaborator(a.id, v_uid)
      or public.findat_is_admin()
    );

  if v_owner is null then
    raise exception 'Analytics access not permitted';
  end if;

  select count(*), count(distinct coalesce(i.viewer_id::text, nullif(i.viewer_session, ''), i.id::text))
    into v_views, v_unique
  from public.findat_article_impressions i
  where i.article_id = p_article_id;

  select coalesce(jsonb_object_agg(q.label, q.total), '{}'::jsonb)
    into v_regions
  from (
    select coalesce(nullif(trim(i.country), ''), 'Unknown') as label, count(*)::bigint as total
    from public.findat_article_impressions i
    where i.article_id = p_article_id
    group by 1
    order by 2 desc, 1
  ) q;

  select coalesce(jsonb_object_agg(q.label, q.total), '{}'::jsonb)
    into v_companies
  from (
    select coalesce(nullif(trim(i.organisation), ''), 'Independent / unspecified') as label, count(*)::bigint as total
    from public.findat_article_impressions i
    where i.article_id = p_article_id
    group by 1
    order by 2 desc, 1
  ) q;

  select coalesce(jsonb_object_agg(q.label, q.total), '{}'::jsonb)
    into v_daily
  from (
    select to_char(date_trunc('day', i.created_at), 'YYYY-MM-DD') as label, count(*)::bigint as total
    from public.findat_article_impressions i
    where i.article_id = p_article_id
      and i.created_at >= now() - interval '30 days'
    group by 1
    order by 1
  ) q;

  select count(*)
    into v_followers
  from public.findat_user_follows f
  where f.following_id = v_owner;

  select coalesce(jsonb_object_agg(q.label, q.total), '{}'::jsonb)
    into v_follower_regions
  from (
    select coalesce(nullif(trim(p.country), ''), 'Unknown') as label, count(*)::bigint as total
    from public.findat_user_follows f
    join public.findat_profiles p on p.id = f.follower_id
    where f.following_id = v_owner and p.active = true
    group by 1
    order by 2 desc, 1
  ) q;

  select coalesce(jsonb_object_agg(q.label, q.total), '{}'::jsonb)
    into v_follower_companies
  from (
    select coalesce(nullif(trim(p.organisation), ''), 'Independent / unspecified') as label, count(*)::bigint as total
    from public.findat_user_follows f
    join public.findat_profiles p on p.id = f.follower_id
    where f.following_id = v_owner and p.active = true
    group by 1
    order by 2 desc, 1
  ) q;

  return jsonb_build_object(
    'views', v_views,
    'unique_viewers', v_unique,
    'regions', v_regions,
    'companies', v_companies,
    'daily', v_daily,
    'followers', v_followers,
    'follower_regions', v_follower_regions,
    'follower_companies', v_follower_companies
  );
end;
$$;

revoke all on table public.findat_article_impressions from public, anon;
revoke all on function public.findat_record_article_impression(uuid, text, text) from public, anon;
revoke all on function public.findat_article_analytics(uuid) from public, anon;
grant select on table public.findat_article_impressions to authenticated;
grant execute on function public.findat_record_article_impression(uuid, text, text) to authenticated;
grant execute on function public.findat_article_analytics(uuid) to authenticated;

commit;
