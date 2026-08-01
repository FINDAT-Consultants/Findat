select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'findat_article_reactions',
    'findat_article_bookmarks',
    'findat_user_follows',
    'findat_social_comments',
    'findat_direct_messages'
  )
order by table_name;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname='public'
  and tablename in (
    'findat_article_reactions',
    'findat_article_bookmarks',
    'findat_user_follows',
    'findat_social_comments',
    'findat_direct_messages'
  )
order by tablename, policyname;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname='realtime'
  and tablename='messages'
  and policyname in (
    'findat realtime social signals read',
    'findat realtime social signals write'
  )
order by policyname;

