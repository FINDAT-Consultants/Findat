-- Verification for FINDAT-SOCIAL-PUBLISHING-RESPONSIVE-FIX.sql
-- Run after the repair migration.

select
  to_regprocedure('public.findat_profile_is_active(uuid)') as active_profile_helper,
  to_regprocedure('public.findat_can_read_article_secure(uuid,uuid)') as article_read_helper,
  to_regprocedure('public.findat_can_edit_article_secure(uuid,uuid)') as article_edit_helper;

select
  to_regclass('public.findat_article_reactions') as reactions_table,
  to_regclass('public.findat_article_bookmarks') as bookmarks_table,
  to_regclass('public.findat_user_follows') as follows_table,
  to_regclass('public.findat_social_comments') as comments_table,
  to_regclass('public.findat_direct_messages') as messages_table;

select
  table_name,
  column_name,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'findat_article_reactions' and column_name = 'user_id')
    or (table_name = 'findat_article_bookmarks' and column_name = 'user_id')
    or (table_name = 'findat_user_follows' and column_name = 'follower_id')
    or (table_name = 'findat_social_comments' and column_name = 'author_id')
    or (table_name = 'findat_direct_messages' and column_name = 'sender_id')
  )
order by table_name;

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'findat_articles',
    'findat_article_reactions',
    'findat_article_bookmarks',
    'findat_user_follows',
    'findat_social_comments',
    'findat_direct_messages'
  )
order by tablename, cmd, policyname;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in (
    'findat_articles',
    'findat_article_reactions',
    'findat_article_bookmarks',
    'findat_user_follows',
    'findat_social_comments',
    'findat_direct_messages'
  )
order by table_name, privilege_type;
