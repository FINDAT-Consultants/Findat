-- FINDAT course/profile/article-activity verification
select
  to_regclass('public.findat_courses') as courses_table,
  to_regclass('public.findat_course_lessons') as lessons_table,
  to_regclass('public.findat_article_revisions') as revisions_table,
  to_regclass('public.findat_article_comments') as comments_table;

select
  to_regprocedure('public.findat_update_own_profile(text,text,text,text,text,text,text,text)') as profile_update_rpc,
  to_regprocedure('public.findat_add_article_comment(uuid,text,uuid)') as comment_rpc,
  to_regprocedure('public.findat_can_access_article(uuid,uuid)') as article_access_rpc;

select slug, title, rating, status, is_builtin
from public.findat_courses
order by created_at;

select
  exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='findat_article_revisions'
  ) as revisions_realtime,
  exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='findat_article_comments'
  ) as comments_realtime,
  exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='findat_courses'
  ) as courses_realtime,
  exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_lessons'
  ) as lessons_realtime;
