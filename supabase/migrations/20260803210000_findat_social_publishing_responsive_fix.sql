-- FINDAT social actions, direct messages and publishing repair
-- Run this entire file in the Supabase SQL Editor as the project owner.
-- It is idempotent and safe to rerun.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Ensure the social tables exist.
-- ---------------------------------------------------------------------------
create table if not exists public.findat_article_reactions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  user_id uuid not null references public.findat_profiles(id) on delete cascade default auth.uid(),
  reaction_type text not null check (reaction_type in ('like','repost')),
  created_at timestamptz not null default now(),
  unique (article_id, user_id, reaction_type)
);

create table if not exists public.findat_article_bookmarks (
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  user_id uuid not null references public.findat_profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create table if not exists public.findat_user_follows (
  follower_id uuid not null references public.findat_profiles(id) on delete cascade default auth.uid(),
  following_id uuid not null references public.findat_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.findat_social_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.findat_articles(id) on delete cascade,
  author_id uuid not null references public.findat_profiles(id) on delete cascade default auth.uid(),
  parent_id uuid references public.findat_social_comments(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.findat_direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.findat_profiles(id) on delete cascade default auth.uid(),
  recipient_id uuid not null references public.findat_profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

alter table public.findat_article_reactions alter column user_id set default auth.uid();
alter table public.findat_article_bookmarks alter column user_id set default auth.uid();
alter table public.findat_user_follows alter column follower_id set default auth.uid();
alter table public.findat_social_comments alter column author_id set default auth.uid();
alter table public.findat_direct_messages alter column sender_id set default auth.uid();

create index if not exists findat_article_reactions_article_idx
  on public.findat_article_reactions(article_id, created_at desc);
create index if not exists findat_article_bookmarks_user_idx
  on public.findat_article_bookmarks(user_id, created_at desc);
create index if not exists findat_user_follows_follower_idx
  on public.findat_user_follows(follower_id, created_at desc);
create index if not exists findat_user_follows_following_idx
  on public.findat_user_follows(following_id, created_at desc);
create index if not exists findat_social_comments_article_idx
  on public.findat_social_comments(article_id, created_at asc);
create index if not exists findat_direct_messages_sender_idx
  on public.findat_direct_messages(sender_id, recipient_id, created_at desc);
create index if not exists findat_direct_messages_recipient_idx
  on public.findat_direct_messages(recipient_id, sender_id, created_at desc);

alter table public.findat_article_reactions enable row level security;
alter table public.findat_article_bookmarks enable row level security;
alter table public.findat_user_follows enable row level security;
alter table public.findat_social_comments enable row level security;
alter table public.findat_direct_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Security-definer helpers prevent cross-table RLS from hiding a valid target.
-- The earlier direct-message policy queried findat_profiles directly. Because
-- members normally see their own profile through direct table RLS, a different
-- recipient could be invisible inside the INSERT policy and the row was denied.
-- ---------------------------------------------------------------------------
create or replace function public.findat_profile_is_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1
    from public.findat_profiles p
    where p.id = p_user_id
      and p.active is not false
  )
$$;

create or replace function public.findat_can_read_article_secure(
  p_article_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and public.findat_profile_is_active(p_user_id)
    and exists (
      select 1
      from public.findat_articles a
      where a.id = p_article_id
        and (
          a.status = 'Published'
          or public.findat_role_for(p_user_id) = 'admin'::public.findat_role
          or a.owner_id = p_user_id
          or a.created_by = p_user_id
          or a.publisher_id = p_user_id
          or exists (
            select 1
            from public.findat_article_collaborators c
            where c.article_id = a.id
              and c.user_id = p_user_id
              and c.status = 'accepted'
          )
        )
    )
$$;

create or replace function public.findat_can_edit_article_secure(
  p_article_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and public.findat_profile_is_active(p_user_id)
    and exists (
      select 1
      from public.findat_articles a
      where a.id = p_article_id
        and (
          public.findat_role_for(p_user_id) = 'admin'::public.findat_role
          or a.owner_id = p_user_id
          or a.created_by = p_user_id
          or a.publisher_id = p_user_id
          or exists (
            select 1
            from public.findat_article_collaborators c
            where c.article_id = a.id
              and c.user_id = p_user_id
              and c.status = 'accepted'
          )
        )
    )
$$;

revoke all on function public.findat_profile_is_active(uuid) from public, anon;
revoke all on function public.findat_can_read_article_secure(uuid, uuid) from public, anon;
revoke all on function public.findat_can_edit_article_secure(uuid, uuid) from public, anon;
grant execute on function public.findat_profile_is_active(uuid) to authenticated;
grant execute on function public.findat_can_read_article_secure(uuid, uuid) to authenticated;
grant execute on function public.findat_can_edit_article_secure(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Social RLS policies.
-- ---------------------------------------------------------------------------
drop policy if exists "findat reactions visible to members" on public.findat_article_reactions;
create policy "findat reactions visible to members"
on public.findat_article_reactions for select
to authenticated
using (public.findat_can_read_article_secure(article_id, (select auth.uid())));

drop policy if exists "findat members create own reactions" on public.findat_article_reactions;
create policy "findat members create own reactions"
on public.findat_article_reactions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.findat_can_read_article_secure(article_id, (select auth.uid()))
);

drop policy if exists "findat members remove own reactions" on public.findat_article_reactions;
create policy "findat members remove own reactions"
on public.findat_article_reactions for delete
to authenticated
using (user_id = (select auth.uid()) or public.findat_is_admin());

drop policy if exists "findat members view own bookmarks" on public.findat_article_bookmarks;
create policy "findat members view own bookmarks"
on public.findat_article_bookmarks for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "findat members create own bookmarks" on public.findat_article_bookmarks;
create policy "findat members create own bookmarks"
on public.findat_article_bookmarks for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.findat_can_read_article_secure(article_id, (select auth.uid()))
);

drop policy if exists "findat members remove own bookmarks" on public.findat_article_bookmarks;
create policy "findat members remove own bookmarks"
on public.findat_article_bookmarks for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "findat follows visible to members" on public.findat_user_follows;
create policy "findat follows visible to members"
on public.findat_user_follows for select
to authenticated
using (public.findat_profile_is_active((select auth.uid())));

drop policy if exists "findat members follow from own account" on public.findat_user_follows;
create policy "findat members follow from own account"
on public.findat_user_follows for insert
to authenticated
with check (
  follower_id = (select auth.uid())
  and following_id <> (select auth.uid())
  and public.findat_profile_is_active((select auth.uid()))
  and public.findat_profile_is_active(following_id)
);

drop policy if exists "findat members unfollow from own account" on public.findat_user_follows;
create policy "findat members unfollow from own account"
on public.findat_user_follows for delete
to authenticated
using (follower_id = (select auth.uid()));

drop policy if exists "findat social comments visible on readable articles" on public.findat_social_comments;
create policy "findat social comments visible on readable articles"
on public.findat_social_comments for select
to authenticated
using (public.findat_can_read_article_secure(article_id, (select auth.uid())));

drop policy if exists "findat members comment on readable articles" on public.findat_social_comments;
create policy "findat members comment on readable articles"
on public.findat_social_comments for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and public.findat_can_read_article_secure(article_id, (select auth.uid()))
);

drop policy if exists "findat authors edit own social comments" on public.findat_social_comments;
create policy "findat authors edit own social comments"
on public.findat_social_comments for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

drop policy if exists "findat authors remove own social comments" on public.findat_social_comments;
create policy "findat authors remove own social comments"
on public.findat_social_comments for delete
to authenticated
using (author_id = (select auth.uid()) or public.findat_is_admin());

drop policy if exists "findat message participants can read" on public.findat_direct_messages;
create policy "findat message participants can read"
on public.findat_direct_messages for select
to authenticated
using (
  public.findat_profile_is_active((select auth.uid()))
  and (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
);

drop policy if exists "findat members send own messages" on public.findat_direct_messages;
create policy "findat members send own messages"
on public.findat_direct_messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and recipient_id <> (select auth.uid())
  and public.findat_profile_is_active((select auth.uid()))
  and public.findat_profile_is_active(recipient_id)
);

drop policy if exists "findat recipients mark messages read" on public.findat_direct_messages;
create policy "findat recipients mark messages read"
on public.findat_direct_messages for update
to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

drop policy if exists "findat senders remove own messages" on public.findat_direct_messages;
create policy "findat senders remove own messages"
on public.findat_direct_messages for delete
to authenticated
using (sender_id = (select auth.uid()) or public.findat_is_admin());

-- ---------------------------------------------------------------------------
-- Article policies: restore saving, publishing and republishing for the roles
-- already enforced by the article write trigger.
-- ---------------------------------------------------------------------------
drop policy if exists "FINDAT authenticated article select" on public.findat_articles;
create policy "FINDAT authenticated article select"
on public.findat_articles for select
to authenticated
using (public.findat_can_read_article_secure(id, (select auth.uid())));

drop policy if exists "FINDAT article insert" on public.findat_articles;
create policy "FINDAT article insert"
on public.findat_articles for insert
to authenticated
with check (
  public.findat_profile_is_active((select auth.uid()))
  and (
    public.findat_role_for((select auth.uid())) = 'admin'::public.findat_role
    or (
      public.findat_role_for((select auth.uid())) = 'client'::public.findat_role
      and owner_id = (select auth.uid())
      and created_by = (select auth.uid())
    )
  )
);

drop policy if exists "FINDAT article update" on public.findat_articles;
create policy "FINDAT article update"
on public.findat_articles for update
to authenticated
using (public.findat_can_edit_article_secure(id, (select auth.uid())))
with check (public.findat_can_edit_article_secure(id, (select auth.uid())));

drop policy if exists "FINDAT article delete" on public.findat_articles;
create policy "FINDAT article delete"
on public.findat_articles for delete
to authenticated
using (public.findat_profile_is_active((select auth.uid())) and public.findat_is_admin());

revoke all on public.findat_article_reactions from anon, authenticated;
revoke all on public.findat_article_bookmarks from anon, authenticated;
revoke all on public.findat_user_follows from anon, authenticated;
revoke all on public.findat_social_comments from anon, authenticated;
revoke all on public.findat_direct_messages from anon, authenticated;

grant select, insert, delete on public.findat_article_reactions to authenticated;
grant select, insert, delete on public.findat_article_bookmarks to authenticated;
grant select, insert, delete on public.findat_user_follows to authenticated;
grant select, insert, update, delete on public.findat_social_comments to authenticated;
grant select, insert, delete on public.findat_direct_messages to authenticated;
grant update (read_at) on public.findat_direct_messages to authenticated;

grant select, insert, update, delete on public.findat_articles to authenticated;

-- Keep Postgres Changes enabled when the publication already exists.
do $$
begin
  begin alter publication supabase_realtime add table public.findat_article_reactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.findat_article_bookmarks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.findat_user_follows; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.findat_social_comments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.findat_direct_messages; exception when duplicate_object then null; end;
end $$;

commit;
