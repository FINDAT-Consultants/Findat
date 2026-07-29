-- FINDAT collaboration request reliability fix
-- Run in Supabase SQL Editor after the earlier collaboration upgrade.
-- Safe to run more than once.

begin;

alter table public.findat_article_collaborators
  add column if not exists updated_at timestamptz not null default now();

alter table public.findat_article_collaborators
  drop constraint if exists findat_collaboration_status_check;

alter table public.findat_article_collaborators
  add constraint findat_collaboration_status_check
  check (status in ('pending', 'accepted', 'rejected', 'cancelled'));

update public.findat_article_collaborators
set updated_at = coalesce(responded_at, created_at, now())
where updated_at is null;

create index if not exists findat_article_collaborators_updated_idx
  on public.findat_article_collaborators(updated_at desc);

-- The author, an Administrator, or an accepted collaborator may add people.
-- Only the author or an Administrator may remove existing people.
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
      and (
        a.owner_id = auth.uid()
        or public.findat_is_admin()
        or public.findat_is_article_collaborator(a.id, auth.uid())
      )
  )
$$;

drop function if exists public.findat_manage_article_collaborators(uuid, uuid[]);

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
  responded_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_count integer;
  v_owner_or_admin boolean := false;
  v_article_title text := 'Untitled paper';
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  select
    coalesce(array_agg(distinct requested.user_id), '{}'::uuid[])
  into v_ids
  from unnest(coalesce(p_user_ids, '{}'::uuid[])) requested(user_id)
  where requested.user_id is not null
    and requested.user_id <> auth.uid();

  select count(*) into v_count from unnest(v_ids);

  if v_count > 5 then
    raise exception 'A paper may have no more than five collaborators';
  end if;

  if not public.findat_can_manage_collaborators(p_article_id) then
    raise exception 'Only the article author, an accepted collaborator or an Administrator can manage collaborators';
  end if;

  select
    (a.owner_id = auth.uid() or public.findat_is_admin()),
    coalesce(nullif(trim(a.title), ''), 'Untitled paper')
  into v_owner_or_admin, v_article_title
  from public.findat_articles a
  where a.id = p_article_id;

  if not found then
    raise exception 'The article could not be found';
  end if;

  if exists (
    select 1
    from unnest(v_ids) requested(user_id)
    left join public.findat_profiles p on p.id = requested.user_id
    where p.id is null
       or p.active = false
       or p.role not in (
         'client'::public.findat_role,
         'consultant'::public.findat_role,
         'admin'::public.findat_role
       )
  ) then
    raise exception 'One or more selected profiles are unavailable';
  end if;

  -- Preserve response history. Only the author or an Administrator may remove
  -- existing active collaborators; removed rows become cancelled instead of
  -- being deleted.
  if v_owner_or_admin then
    update public.findat_article_collaborators c
    set status = 'cancelled',
        responded_at = coalesce(c.responded_at, now()),
        updated_at = now()
    where c.article_id = p_article_id
      and c.status in ('pending', 'accepted')
      and not (c.user_id = any(v_ids));
  end if;

  insert into public.findat_article_collaborators (
    article_id,
    user_id,
    invited_by,
    status,
    created_at,
    responded_at,
    updated_at
  )
  select
    p_article_id,
    requested.user_id,
    auth.uid(),
    'pending',
    now(),
    null,
    now()
  from unnest(v_ids) requested(user_id)
  on conflict (article_id, user_id) do update
  set invited_by = excluded.invited_by,
      status = case
        when public.findat_article_collaborators.status = 'accepted'
          then 'accepted'
        else 'pending'
      end,
      created_at = case
        when public.findat_article_collaborators.status = 'accepted'
          then public.findat_article_collaborators.created_at
        else now()
      end,
      responded_at = case
        when public.findat_article_collaborators.status = 'accepted'
          then public.findat_article_collaborators.responded_at
        else null
      end,
      updated_at = now();

  perform public.findat_write_audit(
    'Collaboration invitations updated',
    format('%s collaborator request(s) are active for “%s”.', v_count, v_article_title),
    p_article_id
  );

  return query
  select
    c.article_id,
    c.user_id,
    c.invited_by,
    c.status,
    c.created_at,
    c.responded_at,
    c.updated_at
  from public.findat_article_collaborators c
  where c.article_id = p_article_id
  order by c.updated_at desc, c.created_at desc;
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
  v_title text := 'Untitled paper';
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  update public.findat_article_collaborators c
  set status = v_status,
      responded_at = now(),
      updated_at = now()
  where c.article_id = p_article_id
    and c.user_id = auth.uid()
    and c.status = 'pending';

  if not found then
    raise exception 'The collaboration request is no longer available';
  end if;

  select coalesce(nullif(trim(a.title), ''), 'Untitled paper')
  into v_title
  from public.findat_articles a
  where a.id = p_article_id;

  perform public.findat_write_audit(
    case when p_accept then 'Collaboration request accepted' else 'Collaboration request rejected' end,
    format('The request for “%s” was %s.', v_title, v_status),
    p_article_id
  );

  return v_status;
end;
$$;

-- Pending requests plus accepted/rejected/cancelled history for the signed-in user.
create or replace function public.findat_collaboration_activity()
returns table (
  direction text,
  article_id uuid,
  article_title text,
  other_user_id uuid,
  other_name text,
  other_avatar_url text,
  status text,
  created_at timestamptz,
  responded_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when c.user_id = auth.uid() then 'incoming' else 'outgoing' end,
    c.article_id,
    coalesce(nullif(trim(a.title), ''), 'Untitled paper'),
    case when c.user_id = auth.uid() then c.invited_by else c.user_id end,
    coalesce(
      nullif(trim(concat_ws(' ', other_profile.first_name, other_profile.last_name)), ''),
      other_profile.username,
      'FINDAT Member'
    ),
    other_profile.avatar_url,
    c.status,
    c.created_at,
    c.responded_at,
    c.updated_at
  from public.findat_article_collaborators c
  join public.findat_articles a on a.id = c.article_id
  join public.findat_profiles other_profile
    on other_profile.id = case
      when c.user_id = auth.uid() then c.invited_by
      else c.user_id
    end
  where auth.uid() is not null
    and public.findat_user_is_active(auth.uid())
    and (
      c.user_id = auth.uid()
      or c.invited_by = auth.uid()
      or a.owner_id = auth.uid()
    )
  order by
    case when c.status = 'pending' and c.user_id = auth.uid() then 0 else 1 end,
    c.updated_at desc,
    c.created_at desc
$$;

-- Keep direct writes disabled; all state changes go through the audited RPCs.
revoke all on function public.findat_manage_article_collaborators(uuid, uuid[]) from public, anon;
revoke all on function public.findat_respond_collaboration(uuid, boolean) from public, anon;
revoke all on function public.findat_collaboration_activity() from public, anon;

grant execute on function public.findat_manage_article_collaborators(uuid, uuid[]) to authenticated;
grant execute on function public.findat_respond_collaboration(uuid, boolean) to authenticated;
grant execute on function public.findat_collaboration_activity() to authenticated;

-- Enable instant delivery where Postgres Changes is used. The frontend retains
-- a timed refresh fallback if Realtime is unavailable.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'findat_article_collaborators'
     )
  then
    alter publication supabase_realtime
      add table public.findat_article_collaborators;
  end if;
end
$$;

commit;

-- Verification: both queries should run without an error.
select public.findat_collaboration_activity();
select article_id, user_id, status, created_at, responded_at, updated_at
from public.findat_article_collaborators
order by updated_at desc
limit 20;
