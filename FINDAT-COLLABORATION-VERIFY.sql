-- FINDAT collaboration verification
-- Run after FINDAT-COLLABORATION-REQUESTS-RELIABILITY-FIX.sql.

select
  to_regclass('public.findat_article_collaborators') as collaboration_table,
  to_regprocedure('public.findat_manage_article_collaborators(uuid,uuid[])') as manage_rpc,
  to_regprocedure('public.findat_respond_collaboration(uuid,boolean)') as respond_rpc,
  to_regprocedure('public.findat_collaboration_activity()') as activity_rpc;

select
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'findat_article_collaborators'
  ) as realtime_enabled;

select
  c.article_id,
  a.title as article_title,
  inviter.username as invited_by,
  invitee.username as invited_user,
  c.status,
  c.created_at,
  c.responded_at,
  c.updated_at
from public.findat_article_collaborators c
join public.findat_articles a on a.id = c.article_id
join public.findat_profiles inviter on inviter.id = c.invited_by
join public.findat_profiles invitee on invitee.id = c.user_id
order by c.updated_at desc, c.created_at desc
limit 50;
