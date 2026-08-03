-- FINDAT course studio, editable profiles, article activity/comments and byline upgrade
-- Run after the existing FINDAT Auth/RBAC, editorial workflow and collaboration migrations.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Editable professional profiles
-- -----------------------------------------------------------------------------

alter table public.findat_profiles
  add column if not exists qualifications text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists place_of_work text not null default '';

create or replace function public.findat_update_own_profile(
  p_first_name text,
  p_last_name text,
  p_phone text default '',
  p_organisation text default '',
  p_country text default '',
  p_qualifications text default '',
  p_job_title text default '',
  p_place_of_work text default ''
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
      updated_at = now()
  where p.id = auth.uid()
  returning p.* into v_profile;

  return v_profile;
end;
$$;

-- Return a complete active-user directory for collaboration and bylines.
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

-- -----------------------------------------------------------------------------
-- 2. Course catalogue and Administrator course studio
-- -----------------------------------------------------------------------------

create table if not exists public.findat_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  short_description text not null default '',
  course_content text not null default '',
  cover_url text not null default '',
  instructor_name text not null default '',
  instructor_qualifications text not null default '',
  rating numeric(2,1) not null default 5.0,
  status text not null default 'draft',
  is_builtin boolean not null default false,
  created_by uuid references public.findat_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_course_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint findat_course_rating_check check (rating between 0 and 5),
  constraint findat_course_status_check check (status in ('draft', 'published'))
);

create unique index if not exists findat_courses_slug_uq on public.findat_courses(slug);
create index if not exists findat_courses_status_idx on public.findat_courses(status, updated_at desc);

create table if not exists public.findat_course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  position integer not null default 1,
  title text not null,
  summary text not null default '',
  lesson_content text not null default '',
  lesson_script text not null default '',
  video_url text not null default '',
  thumbnail_url text not null default '',
  documents jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  duration_seconds integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references public.findat_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_lesson_documents_array_check check (jsonb_typeof(documents) = 'array'),
  constraint findat_lesson_quiz_array_check check (jsonb_typeof(quiz) = 'array'),
  constraint findat_lesson_position_check check (position > 0),
  constraint findat_lesson_duration_check check (duration_seconds >= 0)
);

create index if not exists findat_course_lessons_course_idx
  on public.findat_course_lessons(course_id, position, created_at);

create or replace function public.findat_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists findat_courses_touch_updated_at on public.findat_courses;
create trigger findat_courses_touch_updated_at
before update on public.findat_courses
for each row execute function public.findat_touch_updated_at();

drop trigger if exists findat_course_lessons_touch_updated_at on public.findat_course_lessons;
create trigger findat_course_lessons_touch_updated_at
before update on public.findat_course_lessons
for each row execute function public.findat_touch_updated_at();

alter table public.findat_courses enable row level security;
alter table public.findat_course_lessons enable row level security;

revoke all on public.findat_courses from anon, authenticated;
revoke all on public.findat_course_lessons from anon, authenticated;
grant select on public.findat_courses, public.findat_course_lessons to anon, authenticated;
grant insert, update, delete on public.findat_courses, public.findat_course_lessons to authenticated;

-- Anonymous catalogue readers must be able to evaluate the admin helper used by
-- the combined RLS policy. Without a JWT the helper returns false.
grant execute on function public.findat_is_admin() to anon, authenticated;

drop policy if exists "FINDAT published courses select" on public.findat_courses;
create policy "FINDAT published courses select"
on public.findat_courses for select
to anon, authenticated
using (status = 'published' or public.findat_is_admin());

drop policy if exists "FINDAT admin courses insert" on public.findat_courses;
create policy "FINDAT admin courses insert"
on public.findat_courses for insert
to authenticated
with check (public.findat_is_admin() and created_by = auth.uid());

drop policy if exists "FINDAT admin courses update" on public.findat_courses;
create policy "FINDAT admin courses update"
on public.findat_courses for update
to authenticated
using (public.findat_is_admin())
with check (public.findat_is_admin());

drop policy if exists "FINDAT admin courses delete" on public.findat_courses;
create policy "FINDAT admin courses delete"
on public.findat_courses for delete
to authenticated
using (public.findat_is_admin());

drop policy if exists "FINDAT course lessons select" on public.findat_course_lessons;
create policy "FINDAT course lessons select"
on public.findat_course_lessons for select
to anon, authenticated
using (
  public.findat_is_admin()
  or (
    is_published = true
    and exists (
      select 1 from public.findat_courses c
      where c.id = findat_course_lessons.course_id and c.status = 'published'
    )
  )
);

drop policy if exists "FINDAT admin lessons insert" on public.findat_course_lessons;
create policy "FINDAT admin lessons insert"
on public.findat_course_lessons for insert
to authenticated
with check (public.findat_is_admin() and created_by = auth.uid());

drop policy if exists "FINDAT admin lessons update" on public.findat_course_lessons;
create policy "FINDAT admin lessons update"
on public.findat_course_lessons for update
to authenticated
using (public.findat_is_admin())
with check (public.findat_is_admin());

drop policy if exists "FINDAT admin lessons delete" on public.findat_course_lessons;
create policy "FINDAT admin lessons delete"
on public.findat_course_lessons for delete
to authenticated
using (public.findat_is_admin());

-- Seed the existing course as the first five-star catalogue card.
insert into public.findat_courses (
  id, slug, title, short_description, course_content, instructor_name,
  instructor_qualifications, rating, status, is_builtin, created_by
)
values (
  '11111111-1111-4111-8111-111111111111'::uuid,
  'data-analytics-foundations',
  'Data Analytics Foundations',
  'Learn how data analytics supports evidence-based decisions across professional domains.',
  'Watch the protected lesson, follow the synchronized script, take the knowledge check and earn a FINDAT certificate.',
  'FINDAT Academy',
  'Data Analytics | Research | Professional Practice',
  5.0,
  'published',
  true,
  null
)
on conflict (slug) do update
set rating = 5.0,
    status = 'published',
    is_builtin = true,
    updated_at = now();

update public.findat_courses
set cover_url = 'Classes/Data-Thumbnail.jpg', updated_at = now()
where slug = 'data-analytics-foundations';

insert into public.findat_course_lessons (
  id, course_id, position, title, summary, lesson_content, lesson_script,
  video_url, thumbnail_url, documents, quiz, duration_seconds,
  is_published, created_by
)
values (
  '22222222-2222-4222-8222-222222222222'::uuid,
  (select id from public.findat_courses where slug = 'data-analytics-foundations'),
  1,
  'How Data Analytics Work per Domain',
  'A protected recorded masterclass with synchronized lesson script, notes, quiz and certificate.',
  'This built-in lesson opens the complete existing FINDAT recording experience.',
  '',
  'Classes/Data.MP4',
  'Classes/Data-Thumbnail.jpg',
  '[]'::jsonb,
  '[]'::jsonb,
  0,
  true,
  null
)
on conflict (id) do update
set course_id = excluded.course_id,
    title = excluded.title,
    summary = excluded.summary,
    video_url = excluded.video_url,
    thumbnail_url = excluded.thumbnail_url,
    is_published = true,
    updated_at = now();

-- Course-media objects are public to read, but only Administrators may write.
-- Narrow the original broad write policies so they continue to cover ordinary
-- FINDAT Cloud files while protected course media and profile pictures use the
-- role-specific policies below.
drop policy if exists "FINDAT storage-only insert" on storage.objects;
create policy "FINDAT storage-only insert"
on storage.objects as permissive for insert
to anon, authenticated
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
);

drop policy if exists "FINDAT storage-only update" on storage.objects;
create policy "FINDAT storage-only update"
on storage.objects as permissive for update
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
)
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
);

drop policy if exists "FINDAT storage-only delete" on storage.objects;
create policy "FINDAT storage-only delete"
on storage.objects as permissive for delete
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
);
grant select, insert, update, delete on table storage.objects to authenticated;

drop policy if exists "FINDAT course media select" on storage.objects;
create policy "FINDAT course media select"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/course-media/%'
);

drop policy if exists "FINDAT admin course media insert" on storage.objects;
create policy "FINDAT admin course media insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/course-media/%'
  and public.findat_is_admin()
);

drop policy if exists "FINDAT admin course media update" on storage.objects;
create policy "FINDAT admin course media update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/course-media/%'
  and public.findat_is_admin()
)
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/course-media/%'
  and public.findat_is_admin()
);

drop policy if exists "FINDAT admin course media delete" on storage.objects;
create policy "FINDAT admin course media delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/course-media/%'
  and public.findat_is_admin()
);

-- -----------------------------------------------------------------------------
-- 3. Article revisions, comments, replies and update notifications
-- -----------------------------------------------------------------------------

create table if not exists public.findat_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  actor_id uuid references public.findat_profiles(id) on delete set null,
  actor_name text not null default 'FINDAT Member',
  actor_avatar_url text not null default '',
  actor_qualifications text not null default '',
  summary text not null,
  changed_fields text[] not null default '{}',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists findat_article_revisions_article_idx
  on public.findat_article_revisions(article_id, created_at desc);

create table if not exists public.findat_article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  author_id uuid not null references public.findat_profiles(id) on delete cascade,
  parent_id uuid references public.findat_article_comments(id) on delete cascade,
  author_name text not null default 'FINDAT Member',
  author_avatar_url text not null default '',
  author_qualifications text not null default '',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint findat_article_comment_body_check check (length(trim(body)) between 1 and 4000)
);

create index if not exists findat_article_comments_article_idx
  on public.findat_article_comments(article_id, created_at);
create index if not exists findat_article_comments_parent_idx
  on public.findat_article_comments(parent_id, created_at);

create or replace function public.findat_can_access_article(
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
    from public.findat_articles a
    where a.id = p_article_id
      and (
        a.status = 'Published'
        or public.findat_is_admin()
        or a.owner_id = p_user_id
        or a.created_by = p_user_id
        or a.publisher_id = p_user_id
        or public.findat_is_article_collaborator(a.id, p_user_id)
      )
  )
$$;

alter table public.findat_article_revisions enable row level security;
alter table public.findat_article_comments enable row level security;

revoke all on public.findat_article_revisions from anon, authenticated;
revoke all on public.findat_article_comments from anon, authenticated;
grant select on public.findat_article_revisions, public.findat_article_comments to authenticated;

drop policy if exists "FINDAT article revision select" on public.findat_article_revisions;
create policy "FINDAT article revision select"
on public.findat_article_revisions for select
to authenticated
using (
  public.findat_user_is_active(auth.uid())
  and public.findat_can_access_article(article_id, auth.uid())
);

drop policy if exists "FINDAT article comment select" on public.findat_article_comments;
create policy "FINDAT article comment select"
on public.findat_article_comments for select
to authenticated
using (
  public.findat_user_is_active(auth.uid())
  and public.findat_can_access_article(article_id, auth.uid())
);

-- Extend the existing notification kinds without changing current records.
alter table public.findat_notifications
  drop constraint if exists findat_notification_kind_check;
alter table public.findat_notifications
  add constraint findat_notification_kind_check
  check (kind in (
    'collaboration_request', 'collaboration_response', 'collaboration_cancelled',
    'article_update', 'article_comment', 'course_update', 'system'
  ));

create or replace function public.findat_article_participants(p_article_id uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct participant
  from (
    select a.owner_id as participant
    from public.findat_articles a where a.id = p_article_id
    union all
    select a.created_by from public.findat_articles a where a.id = p_article_id
    union all
    select a.publisher_id from public.findat_articles a where a.id = p_article_id
    union all
    select c.user_id from public.findat_article_collaborators c
      where c.article_id = p_article_id and c.status = 'accepted'
    union all
    select p.id from public.findat_profiles p
      where p.role = 'admin'::public.findat_role and p.active = true
  ) participants
  where participant is not null
$$;

create or replace function public.findat_capture_article_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text := 'FINDAT Member';
  v_actor_avatar text := '';
  v_actor_qualifications text := '';
  v_fields text[] := '{}';
  v_summary text := 'Article updated';
  v_title text := coalesce(nullif(trim(new.title), ''), 'Untitled paper');
  v_recipient uuid;
begin
  if v_actor is not null then
    select
      coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'FINDAT Member'),
      p.avatar_url,
      p.qualifications
    into v_actor_name, v_actor_avatar, v_actor_qualifications
    from public.findat_profiles p
    where p.id = v_actor;
  end if;

  if tg_op = 'INSERT' then
    v_fields := array['created'];
    v_summary := 'Created the article';
  else
    if new.title is distinct from old.title then v_fields := array_append(v_fields, 'title'); end if;
    if new.subtitle is distinct from old.subtitle then v_fields := array_append(v_fields, 'subtitle'); end if;
    if new.content is distinct from old.content then v_fields := array_append(v_fields, 'content'); end if;
    if new.image is distinct from old.image then v_fields := array_append(v_fields, 'cover photo'); end if;
    if new.attachments is distinct from old.attachments then v_fields := array_append(v_fields, 'documents'); end if;
    if new.contributor_layout is distinct from old.contributor_layout then v_fields := array_append(v_fields, 'author layout'); end if;
    if new.status is distinct from old.status then v_fields := array_append(v_fields, 'status'); end if;
    if new.review_note is distinct from old.review_note then v_fields := array_append(v_fields, 'review note'); end if;

    if new.status is distinct from old.status then
      v_summary := case new.status
        when 'Pending approval' then 'Submitted the article for approval'
        when 'Published' then 'Published the article'
        when 'Rejected' then 'Returned the article for revision'
        when 'Draft' then 'Moved the article back to in progress'
        else format('Changed the article status to %s', new.status)
      end;
    elsif array_length(v_fields, 1) is not null then
      v_summary := 'Updated ' || array_to_string(v_fields, ', ');
    else
      return new;
    end if;
  end if;

  insert into public.findat_article_revisions (
    article_id, actor_id, actor_name, actor_avatar_url, actor_qualifications,
    summary, changed_fields, snapshot
  ) values (
    new.id, v_actor, coalesce(v_actor_name, 'FINDAT Member'),
    coalesce(v_actor_avatar, ''), coalesce(v_actor_qualifications, ''),
    v_summary, v_fields,
    jsonb_build_object(
      'title', new.title,
      'subtitle', new.subtitle,
      'status', new.status,
      'updated_at', new.updated_at
    )
  );

  for v_recipient in select user_id from public.findat_article_participants(new.id)
  loop
    if v_actor is null or v_recipient <> v_actor then
      insert into public.findat_notifications (
        recipient_id, actor_id, article_id, kind, title, message,
        action_state, is_read, created_at, updated_at
      ) values (
        v_recipient, v_actor, new.id, 'article_update', 'Article updated',
        format('%s %s on “%s”.', coalesce(v_actor_name, 'A FINDAT member'), lower(v_summary), v_title),
        'none', false, now(), now()
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists findat_articles_capture_revision on public.findat_articles;
create trigger findat_articles_capture_revision
after insert or update on public.findat_articles
for each row execute function public.findat_capture_article_revision();

create or replace function public.findat_add_article_comment(
  p_article_id uuid,
  p_body text,
  p_parent_id uuid default null
)
returns public.findat_article_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comment public.findat_article_comments;
  v_name text;
  v_avatar text;
  v_qualifications text;
  v_title text;
  v_recipient uuid;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;
  if not public.findat_can_access_article(p_article_id, auth.uid()) then
    raise exception 'You do not have access to this article';
  end if;
  if length(trim(coalesce(p_body, ''))) < 1 then
    raise exception 'Comment cannot be empty';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.findat_article_comments c
    where c.id = p_parent_id and c.article_id = p_article_id
  ) then
    raise exception 'The comment being replied to does not belong to this article';
  end if;

  select
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'FINDAT Member'),
    p.avatar_url,
    p.qualifications
  into v_name, v_avatar, v_qualifications
  from public.findat_profiles p where p.id = auth.uid();

  insert into public.findat_article_comments (
    article_id, author_id, parent_id, author_name, author_avatar_url,
    author_qualifications, body
  ) values (
    p_article_id, auth.uid(), p_parent_id, v_name, coalesce(v_avatar, ''),
    coalesce(v_qualifications, ''), left(trim(p_body), 4000)
  ) returning * into v_comment;

  select coalesce(nullif(trim(a.title), ''), 'Untitled paper')
  into v_title from public.findat_articles a where a.id = p_article_id;

  for v_recipient in select user_id from public.findat_article_participants(p_article_id)
  loop
    if v_recipient <> auth.uid() then
      insert into public.findat_notifications (
        recipient_id, actor_id, article_id, kind, title, message,
        action_state, is_read, created_at, updated_at
      ) values (
        v_recipient, auth.uid(), p_article_id, 'article_comment',
        case when p_parent_id is null then 'New article comment' else 'New comment reply' end,
        format('%s %s on “%s”.', v_name,
          case when p_parent_id is null then 'added a comment' else 'replied to a comment' end,
          v_title),
        'none', false, now(), now()
      );
    end if;
  end loop;

  return v_comment;
end;
$$;

create or replace function public.findat_delete_article_comment(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.findat_article_comments c
  set body = '[Comment removed]', deleted_at = now(), updated_at = now()
  where c.id = p_comment_id
    and (c.author_id = auth.uid() or public.findat_is_admin());
  return found;
end;
$$;

-- Add activity tables to Realtime when they are not already included.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'findat_article_revisions'
  ) then
    alter publication supabase_realtime add table public.findat_article_revisions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'findat_article_comments'
  ) then
    alter publication supabase_realtime add table public.findat_article_comments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'findat_courses'
  ) then
    alter publication supabase_realtime add table public.findat_courses;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'findat_course_lessons'
  ) then
    alter publication supabase_realtime add table public.findat_course_lessons;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Permissions
-- -----------------------------------------------------------------------------

revoke all on function public.findat_update_own_profile(text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.findat_collaboration_directory() from public, anon;
revoke all on function public.findat_can_access_article(uuid,uuid) from public, anon;
revoke all on function public.findat_article_participants(uuid) from public, anon;
revoke all on function public.findat_add_article_comment(uuid,text,uuid) from public, anon;
revoke all on function public.findat_delete_article_comment(uuid) from public, anon;

grant execute on function public.findat_update_own_profile(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.findat_collaboration_directory() to authenticated;
grant execute on function public.findat_can_access_article(uuid,uuid) to authenticated;
grant execute on function public.findat_article_participants(uuid) to authenticated;
grant execute on function public.findat_add_article_comment(uuid,text,uuid) to authenticated;
grant execute on function public.findat_delete_article_comment(uuid) to authenticated;

commit;
