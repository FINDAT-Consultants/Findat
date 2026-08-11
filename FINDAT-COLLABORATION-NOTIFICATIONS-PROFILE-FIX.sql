-- FINDAT collaboration, notification and profile-picture reliability fix
-- Run in Supabase SQL Editor after the earlier Auth/RBAC, editor and collaboration SQL files.
-- Safe to run more than once.

begin;

-- -----------------------------------------------------------------------------
-- 1. Durable per-user notifications
-- -----------------------------------------------------------------------------

create table if not exists public.findat_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.findat_profiles(id) on delete cascade,
  actor_id uuid references public.findat_profiles(id) on delete set null,
  article_id uuid references public.findat_articles(id) on delete cascade,
  kind text not null,
  title text not null default '',
  message text not null default '',
  action_state text not null default 'none',
  is_read boolean not null default false,
  read_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_notification_kind_check
    check (kind in ('collaboration_request', 'collaboration_response', 'collaboration_cancelled', 'system')),
  constraint findat_notification_action_state_check
    check (action_state in ('none', 'pending', 'accepted', 'rejected', 'cancelled'))
);

create index if not exists findat_notifications_recipient_idx
  on public.findat_notifications(recipient_id, cleared_at, is_read, created_at desc);
create index if not exists findat_notifications_article_idx
  on public.findat_notifications(article_id, kind, action_state, created_at desc);

alter table public.findat_notifications enable row level security;

drop policy if exists "FINDAT notification select" on public.findat_notifications;
create policy "FINDAT notification select"
  on public.findat_notifications
  for select
  to authenticated
  using (
    recipient_id = auth.uid()
    and public.findat_user_is_active(auth.uid())
  );

-- All writes go through audited SECURITY DEFINER functions.
revoke all on public.findat_notifications from anon, authenticated;
grant select on public.findat_notifications to authenticated;

create or replace function public.findat_notifications_feed()
returns table (
  notification_id uuid,
  kind text,
  article_id uuid,
  article_title text,
  actor_id uuid,
  actor_name text,
  actor_avatar_url text,
  message text,
  action_state text,
  is_read boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    n.id,
    n.kind,
    n.article_id,
    coalesce(nullif(trim(a.title), ''), 'Untitled paper'),
    n.actor_id,
    coalesce(
      nullif(trim(concat_ws(' ', actor.first_name, actor.last_name)), ''),
      actor.username,
      'FINDAT Member'
    ),
    actor.avatar_url,
    n.message,
    n.action_state,
    n.is_read,
    n.created_at,
    n.updated_at
  from public.findat_notifications n
  left join public.findat_articles a on a.id = n.article_id
  left join public.findat_profiles actor on actor.id = n.actor_id
  where auth.uid() is not null
    and public.findat_user_is_active(auth.uid())
    and n.recipient_id = auth.uid()
    and n.cleared_at is null
  order by
    case when n.is_read = false then 0 else 1 end,
    n.created_at desc
$$;

create or replace function public.findat_mark_notifications_read(
  p_notification_ids uuid[] default null
)
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
  set is_read = true,
      read_at = coalesce(n.read_at, now()),
      updated_at = now()
  where n.recipient_id = auth.uid()
    and n.cleared_at is null
    and n.is_read = false
    and (
      p_notification_ids is null
      or n.id = any(p_notification_ids)
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

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

  -- Active unanswered invitations remain visible so they cannot be cleared by
  -- accident. Accepted, rejected, cancelled and informational history is cleared.
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

-- -----------------------------------------------------------------------------
-- 2. Correct collaboration request persistence and eliminate article_id ambiguity
-- -----------------------------------------------------------------------------

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

-- Convert every legacy collaborator_id shortcut into a real pending request.
-- This stops older builds from exposing an article automatically and requires
-- the invited person to accept before the article becomes accessible.
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
  a.id,
  a.collaborator_id,
  a.owner_id,
  'pending',
  coalesce(a.created_at, now()),
  null,
  now()
from public.findat_articles a
where a.collaborator_id is not null
on conflict on constraint findat_article_collaborators_pkey do update
set status = case
      when public.findat_article_collaborators.status = 'accepted' then 'accepted'
      else 'pending'
    end,
    invited_by = excluded.invited_by,
    responded_at = case
      when public.findat_article_collaborators.status = 'accepted'
        then public.findat_article_collaborators.responded_at
      else null
    end,
    updated_at = now();

update public.findat_articles
set collaborator_id = null
where collaborator_id is not null;

-- Backfill durable notifications from collaboration rows created by older
-- FINDAT builds. This makes existing pending requests and response history
-- visible immediately after this migration is applied.
insert into public.findat_notifications (
  recipient_id,
  actor_id,
  article_id,
  kind,
  title,
  message,
  action_state,
  is_read,
  read_at,
  created_at,
  updated_at
)
select
  c.user_id,
  c.invited_by,
  c.article_id,
  'collaboration_request',
  case c.status
    when 'pending' then 'New collaboration request'
    when 'accepted' then 'Collaboration request accepted'
    when 'rejected' then 'Collaboration request rejected'
    else 'Collaboration invitation withdrawn'
  end,
  case c.status
    when 'pending' then format('%s sent you a request to collaborate on “%s”.',
      coalesce(public.findat_profile_display_name(c.invited_by), 'FINDAT Member'),
      coalesce(nullif(trim(a.title), ''), 'Untitled paper'))
    when 'accepted' then format('You accepted the collaboration request for “%s”.',
      coalesce(nullif(trim(a.title), ''), 'Untitled paper'))
    when 'rejected' then format('You rejected the collaboration request for “%s”.',
      coalesce(nullif(trim(a.title), ''), 'Untitled paper'))
    else format('The collaboration invitation for “%s” was withdrawn.',
      coalesce(nullif(trim(a.title), ''), 'Untitled paper'))
  end,
  c.status,
  c.status <> 'pending',
  case when c.status <> 'pending' then coalesce(c.responded_at, c.updated_at, now()) else null end,
  coalesce(c.created_at, now()),
  coalesce(c.updated_at, c.responded_at, c.created_at, now())
from public.findat_article_collaborators as c
join public.findat_articles as a on a.id = c.article_id
where not exists (
  select 1
  from public.findat_notifications as n
  where n.recipient_id = c.user_id
    and n.article_id = c.article_id
    and n.kind = 'collaboration_request'
    and n.action_state = c.status
);

insert into public.findat_notifications (
  recipient_id,
  actor_id,
  article_id,
  kind,
  title,
  message,
  action_state,
  is_read,
  created_at,
  updated_at
)
select
  c.invited_by,
  c.user_id,
  c.article_id,
  'collaboration_response',
  case when c.status = 'accepted' then 'Collaboration accepted' else 'Collaboration rejected' end,
  format('%s %s your collaboration request for “%s”.',
    coalesce(public.findat_profile_display_name(c.user_id), 'FINDAT Member'),
    c.status,
    coalesce(nullif(trim(a.title), ''), 'Untitled paper')),
  c.status,
  false,
  coalesce(c.responded_at, c.updated_at, now()),
  coalesce(c.updated_at, c.responded_at, now())
from public.findat_article_collaborators as c
join public.findat_articles as a on a.id = c.article_id
where c.status in ('accepted', 'rejected')
  and c.invited_by is not null
  and c.invited_by <> c.user_id
  and not exists (
    select 1
    from public.findat_notifications as n
    where n.recipient_id = c.invited_by
      and n.article_id = c.article_id
      and n.actor_id = c.user_id
      and n.kind = 'collaboration_response'
      and n.action_state = c.status
  );

drop function if exists public.findat_manage_article_collaborators(uuid, uuid[]);

create function public.findat_manage_article_collaborators(
  p_article_id uuid,
  p_user_ids uuid[]
)
returns setof public.findat_article_collaborators
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_count integer := 0;
  v_owner_or_admin boolean := false;
  v_article_title text := 'Untitled paper';
  v_actor_name text := 'FINDAT Member';
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  select coalesce(array_agg(distinct requested.user_id), '{}'::uuid[])
  into v_ids
  from unnest(coalesce(p_user_ids, '{}'::uuid[])) as requested(user_id)
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
  from public.findat_articles as a
  where a.id = p_article_id;

  if not found then
    raise exception 'The article could not be found';
  end if;

  v_actor_name := coalesce(public.findat_profile_display_name(auth.uid()), 'FINDAT Member');

  if exists (
    select 1
    from unnest(v_ids) as requested(user_id)
    left join public.findat_profiles as p on p.id = requested.user_id
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

  -- Only the author or an Administrator may remove existing collaborators.
  if v_owner_or_admin then
    update public.findat_article_collaborators as c
    set status = 'cancelled',
        responded_at = coalesce(c.responded_at, now()),
        updated_at = now()
    where c.article_id = p_article_id
      and c.status in ('pending', 'accepted')
      and not (c.user_id = any(v_ids));

    update public.findat_notifications as n
    set action_state = 'cancelled',
        title = 'Collaboration invitation withdrawn',
        message = format('%s withdrew the collaboration invitation for “%s”.', v_actor_name, v_article_title),
        is_read = false,
        read_at = null,
        updated_at = now()
    where n.article_id = p_article_id
      and n.kind = 'collaboration_request'
      and n.action_state = 'pending'
      and not (n.recipient_id = any(v_ids));
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
  from unnest(v_ids) as requested(user_id)
  on conflict on constraint findat_article_collaborators_pkey do update
  set invited_by = excluded.invited_by,
      status = case
        when public.findat_article_collaborators.status = 'accepted' then 'accepted'
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

  -- Replace any still-pending duplicate notification with one fresh notification.
  delete from public.findat_notifications as n
  using unnest(v_ids) as requested(user_id)
  where n.recipient_id = requested.user_id
    and n.article_id = p_article_id
    and n.kind = 'collaboration_request'
    and n.action_state = 'pending';

  insert into public.findat_notifications (
    recipient_id,
    actor_id,
    article_id,
    kind,
    title,
    message,
    action_state,
    is_read,
    created_at,
    updated_at
  )
  select
    c.user_id,
    auth.uid(),
    p_article_id,
    'collaboration_request',
    'New collaboration request',
    format('%s sent you a request to collaborate on “%s”.', v_actor_name, v_article_title),
    'pending',
    false,
    now(),
    now()
  from public.findat_article_collaborators as c
  where c.article_id = p_article_id
    and c.user_id = any(v_ids)
    and c.status = 'pending';

  perform public.findat_write_audit(
    'Collaboration invitations updated',
    format('%s collaborator request(s) are active for “%s”.', v_count, v_article_title),
    p_article_id
  );

  return query
  select c.*
  from public.findat_article_collaborators as c
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
  v_inviter uuid;
  v_owner uuid;
  v_actor_name text := 'FINDAT Member';
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  select c.invited_by
  into v_inviter
  from public.findat_article_collaborators as c
  where c.article_id = p_article_id
    and c.user_id = auth.uid()
    and c.status = 'pending'
  for update;

  if not found then
    raise exception 'The collaboration request is no longer available';
  end if;

  update public.findat_article_collaborators as c
  set status = v_status,
      responded_at = now(),
      updated_at = now()
  where c.article_id = p_article_id
    and c.user_id = auth.uid()
    and c.status = 'pending';

  select
    coalesce(nullif(trim(a.title), ''), 'Untitled paper'),
    a.owner_id
  into v_title, v_owner
  from public.findat_articles as a
  where a.id = p_article_id;

  v_actor_name := coalesce(public.findat_profile_display_name(auth.uid()), 'FINDAT Member');

  update public.findat_notifications as n
  set action_state = v_status,
      title = case when p_accept then 'Collaboration request accepted' else 'Collaboration request rejected' end,
      message = format('You %s the collaboration request for “%s”.', v_status, v_title),
      is_read = true,
      read_at = coalesce(n.read_at, now()),
      updated_at = now()
  where n.recipient_id = auth.uid()
    and n.article_id = p_article_id
    and n.kind = 'collaboration_request'
    and n.action_state = 'pending';

  insert into public.findat_notifications (
    recipient_id,
    actor_id,
    article_id,
    kind,
    title,
    message,
    action_state,
    is_read,
    created_at,
    updated_at
  )
  select distinct
    recipients.recipient_id,
    auth.uid(),
    p_article_id,
    'collaboration_response',
    case when p_accept then 'Collaboration accepted' else 'Collaboration rejected' end,
    format('%s %s your collaboration request for “%s”.', v_actor_name, v_status, v_title),
    v_status,
    false,
    now(),
    now()
  from (
    values (v_inviter), (v_owner)
  ) as recipients(recipient_id)
  where recipients.recipient_id is not null
    and recipients.recipient_id <> auth.uid();

  perform public.findat_write_audit(
    case when p_accept then 'Collaboration request accepted' else 'Collaboration request rejected' end,
    format('The request for “%s” was %s.', v_title, v_status),
    p_article_id
  );

  return v_status;
end;
$$;

-- Pending requests and historical collaboration activity remain available as a
-- compatibility feed for older clients.
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
  from public.findat_article_collaborators as c
  join public.findat_articles as a on a.id = c.article_id
  join public.findat_profiles as other_profile
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

-- -----------------------------------------------------------------------------
-- 3. Pending invitations must not expose the article before acceptance
-- -----------------------------------------------------------------------------

drop policy if exists "FINDAT authenticated article select" on public.findat_articles;
create policy "FINDAT authenticated article select"
  on public.findat_articles
  for select
  to authenticated
  using (
    public.findat_user_is_active(auth.uid())
    and (
      status = 'Published'
      or public.findat_is_admin()
      or owner_id = auth.uid()
      or publisher_id = auth.uid()
      or public.findat_is_article_collaborator(id, auth.uid())
    )
  );

drop policy if exists "FINDAT article update" on public.findat_articles;
create policy "FINDAT article update"
  on public.findat_articles
  for update
  to authenticated
  using (
    public.findat_user_is_active(auth.uid())
    and (
      public.findat_is_admin()
      or owner_id = auth.uid()
      or publisher_id = auth.uid()
      or public.findat_is_article_collaborator(id, auth.uid())
    )
  )
  with check (
    public.findat_user_is_active(auth.uid())
    and (
      public.findat_is_admin()
      or owner_id = auth.uid()
      or publisher_id = auth.uid()
      or public.findat_is_article_collaborator(id, auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Reliable profile-picture persistence
-- -----------------------------------------------------------------------------

create or replace function public.findat_set_profile_avatar(p_avatar_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := trim(coalesce(p_avatar_url, ''));
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  if length(v_url) > 750000 then
    raise exception 'The profile image is too large';
  end if;

  if v_url <> ''
     and v_url not like 'https://%'
     and v_url not like 'data:image/%;base64,%'
  then
    raise exception 'The profile image address is invalid';
  end if;

  update public.findat_profiles as p
  set avatar_url = v_url,
      updated_at = now()
  where p.id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  return v_url;
end;
$$;

create or replace function public.findat_clear_profile_avatar()
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
  set avatar_url = '',
      updated_at = now()
  where p.id = auth.uid();

  return found;
end;
$$;

-- Explicit authenticated Storage permissions for the signed-in user's avatar
-- folder. Existing FINDAT document policies remain unchanged.
grant select, insert, update, delete on table storage.objects to authenticated;

drop policy if exists "FINDAT own profile avatar select" on storage.objects;
create policy "FINDAT own profile avatar select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'findat-documents'
    and name like ('findat-v1/profiles/' || auth.uid()::text || '/%')
  );

drop policy if exists "FINDAT own profile avatar insert" on storage.objects;
create policy "FINDAT own profile avatar insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'findat-documents'
    and name like ('findat-v1/profiles/' || auth.uid()::text || '/%')
  );

drop policy if exists "FINDAT own profile avatar update" on storage.objects;
create policy "FINDAT own profile avatar update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'findat-documents'
    and name like ('findat-v1/profiles/' || auth.uid()::text || '/%')
  )
  with check (
    bucket_id = 'findat-documents'
    and name like ('findat-v1/profiles/' || auth.uid()::text || '/%')
  );

drop policy if exists "FINDAT own profile avatar delete" on storage.objects;
create policy "FINDAT own profile avatar delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'findat-documents'
    and name like ('findat-v1/profiles/' || auth.uid()::text || '/%')
  );

-- -----------------------------------------------------------------------------
-- 5. Permissions and Realtime
-- -----------------------------------------------------------------------------

revoke all on function public.findat_notifications_feed() from public, anon;
revoke all on function public.findat_mark_notifications_read(uuid[]) from public, anon;
revoke all on function public.findat_clear_notification_history() from public, anon;
revoke all on function public.findat_manage_article_collaborators(uuid, uuid[]) from public, anon;
revoke all on function public.findat_respond_collaboration(uuid, boolean) from public, anon;
revoke all on function public.findat_collaboration_activity() from public, anon;
revoke all on function public.findat_set_profile_avatar(text) from public, anon;
revoke all on function public.findat_clear_profile_avatar() from public, anon;

grant execute on function public.findat_notifications_feed() to authenticated;
grant execute on function public.findat_mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.findat_clear_notification_history() to authenticated;
grant execute on function public.findat_manage_article_collaborators(uuid, uuid[]) to authenticated;
grant execute on function public.findat_respond_collaboration(uuid, boolean) to authenticated;
grant execute on function public.findat_collaboration_activity() to authenticated;
grant execute on function public.findat_set_profile_avatar(text) to authenticated;
grant execute on function public.findat_clear_profile_avatar() to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'findat_article_collaborators'
    ) then
      alter publication supabase_realtime add table public.findat_article_collaborators;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'findat_notifications'
    ) then
      alter publication supabase_realtime add table public.findat_notifications;
    end if;
  end if;
end
$$;

commit;

-- Verification summary
select
  to_regclass('public.findat_notifications') as notifications_table,
  to_regprocedure('public.findat_manage_article_collaborators(uuid,uuid[])') as manage_collaborators_rpc,
  to_regprocedure('public.findat_respond_collaboration(uuid,boolean)') as respond_collaboration_rpc,
  to_regprocedure('public.findat_notifications_feed()') as notifications_feed_rpc,
  to_regprocedure('public.findat_set_profile_avatar(text)') as profile_avatar_rpc;
