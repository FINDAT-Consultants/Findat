-- FINDAT professional profiles, social analytics, trending and x1 adaptive-knowledge upgrade
-- Run after FINDAT-AUTOMATIC-CLIENT-REGISTRATION-UPGRADE.sql and the Writing Desk social migration.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Complete professional profiles and cover pictures
-- -----------------------------------------------------------------------------

create unique index if not exists findat_account_registration_notification_unique_idx
  on public.findat_notifications (recipient_id, title)
  where title like 'account_registered:%';

alter table public.findat_profiles
  add column if not exists cover_url text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists industry text not null default '',
  add column if not exists region text not null default '';

create or replace function public.findat_set_profile_cover(p_cover_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := left(trim(coalesce(p_cover_url, '')), 1200000);
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;
  update public.findat_profiles
  set cover_url = v_url,
      updated_at = now()
  where id = auth.uid();
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
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.findat_profiles set cover_url = '', updated_at = now() where id = auth.uid();
  return found;
end;
$$;

-- Replace the old eight-argument profile function with the expanded profile editor.
drop function if exists public.findat_update_own_profile(text,text,text,text,text,text,text,text);
drop function if exists public.findat_update_own_profile(text,text,text,text,text,text,text,text,text,text,text);
create function public.findat_update_own_profile(
  p_first_name text,
  p_last_name text,
  p_phone text default '',
  p_organisation text default '',
  p_country text default '',
  p_qualifications text default '',
  p_job_title text default '',
  p_place_of_work text default '',
  p_industry text default '',
  p_region text default '',
  p_bio text default ''
)
returns public.findat_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.findat_profiles;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;
  if length(trim(coalesce(p_first_name, ''))) < 1
     or length(trim(coalesce(p_last_name, ''))) < 1 then
    raise exception 'First name and last name are required';
  end if;

  update public.findat_profiles p
  set first_name = left(trim(p_first_name), 80),
      last_name = left(trim(p_last_name), 80),
      phone = left(trim(coalesce(p_phone, '')), 60),
      organisation = left(trim(coalesce(p_organisation, '')), 180),
      country = left(trim(coalesce(p_country, '')), 100),
      qualifications = left(trim(coalesce(p_qualifications, '')), 300),
      job_title = left(trim(coalesce(p_job_title, '')), 140),
      place_of_work = left(trim(coalesce(p_place_of_work, '')), 180),
      industry = left(trim(coalesce(p_industry, '')), 140),
      region = left(trim(coalesce(p_region, '')), 140),
      bio = left(trim(coalesce(p_bio, '')), 800),
      updated_at = now()
  where p.id = auth.uid()
  returning p.* into v_profile;

  return v_profile;
end;
$$;

-- Active member directory used by collaboration, profile viewing and audience analytics.
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
  region text,
  role public.findat_role,
  avatar_url text,
  cover_url text,
  bio text,
  industry text,
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
    p.region,
    p.role,
    p.avatar_url,
    p.cover_url,
    p.bio,
    p.industry,
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

-- Ensure public and Google registrations copy the supplied avatar into the profile.
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
  select p.role into v_existing_role from public.findat_profiles p where p.id = new.id;
  v_username := public.findat_normalise_username(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1)),
    new.id
  );
  if exists (select 1 from public.findat_profiles p where lower(p.username)=lower(v_username) and p.id<>new.id) then
    v_username := left(v_username, 20) || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if new.raw_app_meta_data ->> 'findat_role' in ('admin','consultant','client') then
    v_role := (new.raw_app_meta_data ->> 'findat_role')::public.findat_role;
  elsif v_existing_role is not null then
    v_role := v_existing_role;
  end if;

  insert into public.findat_profiles (
    id, username, email, first_name, last_name, phone, organisation, country,
    role, active, avatar_url
  ) values (
    new.id,
    v_username,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'family_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'organisation', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    v_role,
    true,
    left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''), 1200000)
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = case when excluded.first_name<>'' then excluded.first_name else public.findat_profiles.first_name end,
    last_name = case when excluded.last_name<>'' then excluded.last_name else public.findat_profiles.last_name end,
    phone = case when excluded.phone<>'' then excluded.phone else public.findat_profiles.phone end,
    organisation = case when excluded.organisation<>'' then excluded.organisation else public.findat_profiles.organisation end,
    country = case when excluded.country<>'' then excluded.country else public.findat_profiles.country end,
    avatar_url = case when public.findat_profiles.avatar_url='' and excluded.avatar_url<>'' then excluded.avatar_url else public.findat_profiles.avatar_url end,
    role = excluded.role,
    updated_at = now();

  if tg_op='INSERT' and coalesce(new.raw_app_meta_data ->> 'findat_role','')='' then
    v_display_name := nullif(trim(concat_ws(' ',coalesce(new.raw_user_meta_data ->> 'first_name',''),coalesce(new.raw_user_meta_data ->> 'last_name',''))),'');
    insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state,is_read)
    select administrator.id,new.id,'system','account_registered:'||new.id::text,
      format('New Client registered: %s (@%s). The account was activated automatically and can use FINDAT immediately.',coalesce(v_display_name,v_username),v_username),
      'none',false
    from public.findat_profiles administrator
    where administrator.role='admin' and administrator.active=true
    on conflict (recipient_id,title) where title like 'account_registered:%' do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists findat_on_auth_user_created on auth.users;
create trigger findat_on_auth_user_created
  after insert or update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.findat_handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 2. Transparent, anti-spam social analytics and trending
-- -----------------------------------------------------------------------------

create table if not exists public.findat_article_events (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  actor_id uuid not null references public.findat_profiles(id) on delete cascade default auth.uid(),
  session_id text not null default '',
  event_type text not null check (event_type in ('impression','view','share','profile_view')),
  event_day date not null default (now() at time zone 'utc')::date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(article_id, actor_id, event_type, event_day)
);

create index if not exists findat_article_events_article_idx on public.findat_article_events(article_id,event_type,created_at desc);
create index if not exists findat_article_events_actor_idx on public.findat_article_events(actor_id,created_at desc);

alter table public.findat_article_events enable row level security;

drop policy if exists "findat members create own article events" on public.findat_article_events;
create policy "findat members create own article events"
on public.findat_article_events for insert to authenticated
with check (
  actor_id=auth.uid()
  and public.findat_user_is_active(auth.uid())
  and public.findat_can_access_article(article_id,auth.uid())
);

drop policy if exists "findat owners read article analytics" on public.findat_article_events;
create policy "findat owners read article analytics"
on public.findat_article_events for select to authenticated
using (
  public.findat_is_admin()
  or exists (
    select 1 from public.findat_articles a
    where a.id=article_id and coalesce(a.owner_id,a.created_by)=auth.uid()
  )
);

create or replace function public.findat_record_article_event(
  p_article_id uuid,
  p_event_type text,
  p_session_id text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;
  if p_event_type not in ('impression','view','share','profile_view') then
    raise exception 'Unsupported analytics event';
  end if;
  if not public.findat_can_access_article(p_article_id,auth.uid()) then
    raise exception 'Article access denied';
  end if;
  insert into public.findat_article_events(article_id,actor_id,session_id,event_type,event_day,metadata)
  values(p_article_id,auth.uid(),left(coalesce(p_session_id,''),120),p_event_type,(now() at time zone 'utc')::date,coalesce(p_metadata,'{}'::jsonb))
  on conflict(article_id,actor_id,event_type,event_day)
  do update set created_at=excluded.created_at,session_id=excluded.session_id,metadata=public.findat_article_events.metadata||excluded.metadata;
  return true;
end;
$$;

create or replace function public.findat_trending_articles(p_limit integer default 100)
returns table(
  article_id uuid,
  score numeric,
  views bigint,
  impressions bigint,
  likes bigint,
  reposts bigint,
  comments bigint,
  bookmarks bigint,
  age_hours numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with published as (
    select a.id,a.owner_id,a.created_by,coalesce(a.published_at,a.updated_at,a.created_at) as published_at
    from public.findat_articles a
    where a.status='Published'
  ), events as (
    select e.article_id,
      count(*) filter(where e.event_type='view')::bigint as views,
      count(*) filter(where e.event_type='impression')::bigint as impressions,
      count(*) filter(where e.event_type='share')::bigint as shares
    from public.findat_article_events e
    where e.created_at>now()-interval '90 days'
    group by e.article_id
  ), reactions as (
    select r.article_id,
      count(*) filter(where r.reaction_type='like')::bigint as likes,
      count(*) filter(where r.reaction_type='repost')::bigint as reposts
    from public.findat_article_reactions r group by r.article_id
  ), comments as (
    select c.article_id,count(*)::bigint as comments from public.findat_social_comments c group by c.article_id
  ), bookmarks as (
    select b.article_id,count(*)::bigint as bookmarks from public.findat_article_bookmarks b group by b.article_id
  )
  select p.id,
    round(((
      coalesce(e.views,0)*1.10 + coalesce(e.impressions,0)*0.12 + coalesce(e.shares,0)*4.50 +
      coalesce(r.likes,0)*2.40 + coalesce(r.reposts,0)*4.75 + coalesce(c.comments,0)*3.80 +
      coalesce(b.bookmarks,0)*2.00 +
      case when exists(select 1 from public.findat_user_follows f where f.follower_id=auth.uid() and f.following_id=coalesce(p.owner_id,p.created_by)) then 2.25 else 0 end
    ) / power(greatest(2,extract(epoch from (now()-p.published_at))/3600+2),0.58))::numeric,4) as score,
    coalesce(e.views,0),coalesce(e.impressions,0),coalesce(r.likes,0),coalesce(r.reposts,0),coalesce(c.comments,0),coalesce(b.bookmarks,0),
    round((extract(epoch from (now()-p.published_at))/3600)::numeric,2)
  from published p
  left join events e on e.article_id=p.id
  left join reactions r on r.article_id=p.id
  left join comments c on c.article_id=p.id
  left join bookmarks b on b.article_id=p.id
  where auth.uid() is not null and public.findat_user_is_active(auth.uid())
  order by score desc,p.published_at desc
  limit greatest(1,least(coalesce(p_limit,100),250))
$$;

revoke all on function public.findat_set_profile_cover(text) from public,anon;
revoke all on function public.findat_clear_profile_cover() from public,anon;
revoke all on function public.findat_update_own_profile(text,text,text,text,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.findat_collaboration_directory() from public,anon;
revoke all on function public.findat_record_article_event(uuid,text,text,jsonb) from public,anon;
revoke all on function public.findat_trending_articles(integer) from public,anon;

grant execute on function public.findat_set_profile_cover(text) to authenticated;
grant execute on function public.findat_clear_profile_cover() to authenticated;
grant execute on function public.findat_update_own_profile(text,text,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.findat_collaboration_directory() to authenticated;
grant execute on function public.findat_record_article_event(uuid,text,text,jsonb) to authenticated;
grant execute on function public.findat_trending_articles(integer) to authenticated;
grant select,insert on public.findat_article_events to authenticated;

commit;
