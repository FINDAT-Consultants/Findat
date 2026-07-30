-- FINDAT collaboration, notification and profile-picture verification

select
  to_regclass('public.findat_article_collaborators') as collaboration_table,
  to_regclass('public.findat_notifications') as notifications_table,
  to_regprocedure('public.findat_manage_article_collaborators(uuid,uuid[])') as manage_collaborators_rpc,
  to_regprocedure('public.findat_respond_collaboration(uuid,boolean)') as respond_collaboration_rpc,
  to_regprocedure('public.findat_notifications_feed()') as notifications_feed_rpc,
  to_regprocedure('public.findat_mark_notifications_read(uuid[])') as mark_notifications_rpc,
  to_regprocedure('public.findat_clear_notification_history()') as clear_notifications_rpc,
  to_regprocedure('public.findat_set_profile_avatar(text)') as set_avatar_rpc,
  to_regprocedure('public.findat_clear_profile_avatar()') as clear_avatar_rpc;

select
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('findat_articles', 'findat_article_collaborators', 'findat_notifications')
order by tablename;

select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in ('findat_articles', 'findat_article_collaborators', 'findat_notifications')
order by tablename, policyname;

select
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'findat_article_collaborators'
  ) as collaboration_realtime_enabled,
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'findat_notifications'
  ) as notifications_realtime_enabled;

select
  count(*) as collaboration_rows,
  count(*) filter (where status = 'pending') as pending_requests,
  count(*) filter (where status = 'accepted') as accepted_requests,
  count(*) filter (where status = 'rejected') as rejected_requests,
  count(*) filter (where status = 'cancelled') as cancelled_requests
from public.findat_article_collaborators;

select
  count(*) as notification_rows,
  count(*) filter (where is_read = false and cleared_at is null) as unread_notifications,
  count(*) filter (where cleared_at is not null) as cleared_notifications
from public.findat_notifications;
