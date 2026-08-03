-- FINDAT collaboration, contributor byline and delegated publishing upgrade
-- Run once in Supabase SQL Editor after the existing Auth/RBAC and editor workflow SQL.

begin;

alter table public.findat_profiles
  add column if not exists avatar_url text not null default '';

alter table public.findat_articles
  add column if not exists contributor_layout jsonb not null default '[]'::jsonb,
  add column if not exists publisher_id uuid references public.findat_profiles(id) on delete set null,
  add column if not exists publisher_assigned_by uuid references public.findat_profiles(id) on delete set null,
  add column if not exists publisher_assigned_at timestamptz;

alter table public.findat_articles
  drop constraint if exists findat_article_contributor_layout_check;
alter table public.findat_articles
  add constraint findat_article_contributor_layout_check
  check (jsonb_typeof(contributor_layout) = 'array');

create index if not exists findat_articles_publisher_idx
  on public.findat_articles(publisher_id, status, updated_at desc);

create table if not exists public.findat_article_collaborators (
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  invited_by uuid not null references public.findat_profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (article_id, user_id),
  constraint findat_collaboration_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create index if not exists findat_article_collaborators_user_idx
  on public.findat_article_collaborators(user_id, status, created_at desc);
create index if not exists findat_article_collaborators_article_idx
  on public.findat_article_collaborators(article_id, status, created_at);

-- Preserve previous one-consultant assignments as accepted collaboration membership.
insert into public.findat_article_collaborators(article_id, user_id, invited_by, status, responded_at)
select a.id, a.collaborator_id, a.owner_id, 'accepted', now()
from public.findat_articles a
where a.collaborator_id is not null
on conflict (article_id, user_id) do nothing;

create or replace function public.findat_is_article_collaborator(
  p_article_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.findat_article_collaborators c
    join public.findat_profiles p on p.id = c.user_id
    where c.article_id = p_article_id
      and c.user_id = p_user_id
      and c.status = 'accepted'
      and p.active = true
  )
$$;

create or replace function public.findat_is_article_owner(
  p_article_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.findat_articles a
    where a.id = p_article_id and a.owner_id = p_user_id
  )
$$;

create or replace function public.findat_can_manage_collaborators(p_article_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.findat_articles a
    where a.id = p_article_id
      and (a.owner_id = auth.uid() or public.findat_is_admin())
  )
$$;

create or replace function public.findat_collaboration_directory()
returns table (
  id uuid,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'FINDAT Member') as display_name,
    p.avatar_url
  from public.findat_profiles p
  where auth.uid() is not null
    and public.findat_user_is_active(auth.uid())
    and p.active = true
  order by display_name
$$;

create or replace function public.findat_collaboration_inbox()
returns table (
  article_id uuid,
  article_title text,
  invited_by uuid,
  inviter_name text,
  inviter_avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.article_id,
    a.title,
    c.invited_by,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'FINDAT Member'),
    p.avatar_url,
    c.created_at
  from public.findat_article_collaborators c
  join public.findat_articles a on a.id = c.article_id
  join public.findat_profiles p on p.id = c.invited_by
  where c.user_id = auth.uid()
    and c.status = 'pending'
    and public.findat_user_is_active(auth.uid())
  order by c.created_at desc
$$;

create or replace function public.findat_manage_article_collaborators(
  p_article_id uuid,
  p_user_ids uuid[]
)
returns table (
  article_id uuid,
  user_id uuid,
  invited_by uuid,
  status text,
  created_at timestamptz,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := coalesce(p_user_ids, '{}'::uuid[]);
  v_count integer;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  if not public.findat_can_manage_collaborators(p_article_id) then
    raise exception 'Only the article author or an Administrator can manage collaborators';
  end if;

  select count(distinct item) into v_count
  from unnest(v_ids) as u(item)
  where item is not null and item <> auth.uid();

  if v_count > 5 then
    raise exception 'A paper may have no more than five collaborators';
  end if;

  if exists (
    select 1
    from unnest(v_ids) requested(user_id)
    left join public.findat_profiles p on p.id = requested.user_id
    where requested.user_id is not null
      and requested.user_id <> auth.uid()
      and (p.id is null or p.active = false)
  ) then
    raise exception 'One or more selected profiles are unavailable';
  end if;

  delete from public.findat_article_collaborators c
  where c.article_id = p_article_id
    and not (c.user_id = any(v_ids));

  insert into public.findat_article_collaborators(article_id, user_id, invited_by, status, created_at, responded_at)
  select p_article_id, requested.user_id, auth.uid(), 'pending', now(), null
  from (
    select distinct u.item as user_id
    from unnest(v_ids) as u(item)
    where u.item is not null and u.item <> auth.uid()
  ) requested
  on conflict (article_id, user_id) do update
  set invited_by = excluded.invited_by,
      status = case
        when public.findat_article_collaborators.status = 'accepted' then 'accepted'
        else 'pending'
      end,
      created_at = case
        when public.findat_article_collaborators.status = 'accepted' then public.findat_article_collaborators.created_at
        else now()
      end,
      responded_at = case
        when public.findat_article_collaborators.status = 'accepted' then public.findat_article_collaborators.responded_at
        else null
      end;

  return query
  select c.article_id, c.user_id, c.invited_by, c.status, c.created_at, c.responded_at
  from public.findat_article_collaborators c
  where c.article_id = p_article_id
  order by c.created_at;
end;
$$;

create or replace function public.findat_respond_collaboration(
  p_article_id uuid,
  p_accept boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text := case when p_accept then 'accepted' else 'rejected' end;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  update public.findat_article_collaborators
  set status = v_status,
      responded_at = now()
  where article_id = p_article_id
    and user_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'The collaboration request is no longer available';
  end if;

  return v_status;
end;
$$;

create or replace function public.findat_assign_article_publisher(
  p_article_ids uuid[],
  p_consultant_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null or not public.findat_is_admin() then
    raise exception 'Administrator privileges are required';
  end if;

  if not public.findat_validate_consultant(p_consultant_id) then
    raise exception 'Select an active Consultant';
  end if;

  update public.findat_articles a
  set publisher_id = p_consultant_id,
      publisher_assigned_by = auth.uid(),
      publisher_assigned_at = now(),
      updated_at = now()
  where a.id = any(coalesce(p_article_ids, '{}'::uuid[]))
    and a.status = 'Pending approval';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.findat_publish_assigned_article(p_article_id uuid)
returns public.findat_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.findat_articles;
begin
  if auth.uid() is null
     or public.findat_role_for(auth.uid()) <> 'consultant'::public.findat_role then
    raise exception 'An active Consultant account is required';
  end if;

  select * into v_article
  from public.findat_articles
  where id = p_article_id
  for update;

  if v_article.id is null
     or v_article.publisher_id <> auth.uid()
     or v_article.status <> 'Pending approval' then
    raise exception 'This article is not assigned to you for publication';
  end if;

  perform set_config('findat.delegated_publish', 'on', true);

  update public.findat_articles
  set status = 'Published',
      published_at = now(),
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_note = 'Published by an Administrator-assigned Consultant.',
      updated_at = now()
  where id = p_article_id
  returning * into v_article;

  return v_article;
end;
$$;

-- Rebuild article write guard to allow accepted collaborators to edit while
-- reserving approval/publication for Administrators and explicit delegated publishing.
create or replace function public.findat_guard_article_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.findat_role := public.findat_role_for(auth.uid());
  v_is_owner boolean := false;
  v_is_collaborator boolean := false;
  v_delegated_publish boolean := coalesce(current_setting('findat.delegated_publish', true), '') = 'on';
begin
  if auth.role() = 'service_role' then
    new.updated_at := now();
    new.author_name := coalesce(public.findat_profile_display_name(new.owner_id), new.author_name, 'FINDAT Member');
    return new;
  end if;

  if v_uid is null or v_role is null then
    raise exception 'Authentication required';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.owner_id := coalesce(new.owner_id, v_uid);
    new.created_by := coalesce(new.created_by, v_uid);

    if v_role = 'consultant' then
      raise exception 'Consultants can edit collaborative or assigned articles but cannot create articles';
    elsif v_role = 'client' then
      if new.owner_id <> v_uid or new.created_by <> v_uid then
        raise exception 'Clients may create only their own articles';
      end if;
      if new.status not in ('Draft', 'Pending approval') then
        raise exception 'Clients cannot approve or publish articles';
      end if;
      new.collaborator_id := null;
      new.publisher_id := null;
      new.publisher_assigned_by := null;
      new.publisher_assigned_at := null;
      new.attachments := '[]'::jsonb;
      new.review_note := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.published_at := null;
    end if;
  else
    new.updated_at := now();
    v_is_owner := old.owner_id = v_uid;
    v_is_collaborator := public.findat_is_article_collaborator(old.id, v_uid) or old.publisher_id = v_uid;

    if v_role = 'admin' then
      null;
    elsif v_delegated_publish
      and v_role = 'consultant'
      and old.publisher_id = v_uid
      and old.status = 'Pending approval'
      and new.status = 'Published' then
      new.owner_id := old.owner_id;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
      new.collaborator_id := old.collaborator_id;
      new.publisher_id := old.publisher_id;
      new.publisher_assigned_by := old.publisher_assigned_by;
      new.publisher_assigned_at := old.publisher_assigned_at;
      new.title := old.title;
      new.subtitle := old.subtitle;
      new.content := old.content;
      new.template := old.template;
      new.category := old.category;
      new.image := old.image;
      new.attachments := old.attachments;
      new.contributor_layout := old.contributor_layout;
    else
      if not v_is_owner and not v_is_collaborator then
        raise exception 'You do not have editing access to this article';
      end if;
      if old.status = 'Published' then
        raise exception 'Published articles may be changed only by an Administrator';
      end if;

      new.owner_id := old.owner_id;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
      new.collaborator_id := old.collaborator_id;
      new.publisher_id := old.publisher_id;
      new.publisher_assigned_by := old.publisher_assigned_by;
      new.publisher_assigned_at := old.publisher_assigned_at;
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.published_at := old.published_at;

      if not v_is_owner then
        new.status := old.status;
        new.submitted_at := old.submitted_at;
        new.review_note := old.review_note;
        new.contributor_layout := old.contributor_layout;
      else
        if new.status not in ('Draft', 'Pending approval') then
          raise exception 'Only an Administrator can approve or publish articles';
        end if;
        if new.status = 'Pending approval' then
          new.submitted_at := coalesce(new.submitted_at, now());
          new.review_note := null;
        end if;
      end if;

      if v_role = 'client' then
        new.attachments := old.attachments;
      end if;
    end if;
  end if;

  new.author_name := coalesce(public.findat_profile_display_name(new.owner_id), new.author_name, 'FINDAT Member');
  return new;
end;
$$;

alter table public.findat_article_collaborators enable row level security;

drop policy if exists "FINDAT collaboration select" on public.findat_article_collaborators;
create policy "FINDAT collaboration select"
  on public.findat_article_collaborators for select to authenticated
  using (
    public.findat_user_is_active(auth.uid())
    and (
      public.findat_is_admin()
      or user_id = auth.uid()
      or invited_by = auth.uid()
      or public.findat_is_article_owner(article_id, auth.uid())
    )
  );

-- Direct collaboration writes are intentionally disabled; use the two RPCs.
revoke all on public.findat_article_collaborators from anon, authenticated;
grant select on public.findat_article_collaborators to authenticated;

-- Extend article visibility and editing to accepted collaborators and assigned publishers.
drop policy if exists "FINDAT authenticated article select" on public.findat_articles;
create policy "FINDAT authenticated article select"
  on public.findat_articles for select to authenticated
  using (
    public.findat_user_is_active(auth.uid())
    and (
      status = 'Published'
      or public.findat_is_admin()
      or owner_id = auth.uid()
      or collaborator_id = auth.uid()
      or publisher_id = auth.uid()
      or public.findat_is_article_collaborator(id, auth.uid())
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
      or collaborator_id = auth.uid()
      or publisher_id = auth.uid()
      or public.findat_is_article_collaborator(id, auth.uid())
    )
  )
  with check (
    public.findat_user_is_active(auth.uid())
    and (
      public.findat_is_admin()
      or owner_id = auth.uid()
      or collaborator_id = auth.uid()
      or publisher_id = auth.uid()
      or public.findat_is_article_collaborator(id, auth.uid())
    )
  );

-- Restrict security-definer helpers before granting authenticated access.
revoke all on function public.findat_collaboration_directory() from public, anon;
revoke all on function public.findat_collaboration_inbox() from public, anon;
revoke all on function public.findat_manage_article_collaborators(uuid, uuid[]) from public, anon;
revoke all on function public.findat_respond_collaboration(uuid, boolean) from public, anon;
revoke all on function public.findat_assign_article_publisher(uuid[], uuid) from public, anon;
revoke all on function public.findat_publish_assigned_article(uuid) from public, anon;
revoke all on function public.findat_is_article_collaborator(uuid, uuid) from public, anon;
revoke all on function public.findat_is_article_owner(uuid, uuid) from public, anon;
revoke all on function public.findat_can_manage_collaborators(uuid) from public, anon;

-- Allow trusted RPCs and directory access.
grant execute on function public.findat_collaboration_directory() to authenticated;
grant execute on function public.findat_collaboration_inbox() to authenticated;
grant execute on function public.findat_manage_article_collaborators(uuid, uuid[]) to authenticated;
grant execute on function public.findat_respond_collaboration(uuid, boolean) to authenticated;
grant execute on function public.findat_assign_article_publisher(uuid[], uuid) to authenticated;
grant execute on function public.findat_publish_assigned_article(uuid) to authenticated;

grant execute on function public.findat_is_article_collaborator(uuid, uuid) to authenticated;
grant execute on function public.findat_is_article_owner(uuid, uuid) to authenticated;
grant execute on function public.findat_can_manage_collaborators(uuid) to authenticated;

commit;
