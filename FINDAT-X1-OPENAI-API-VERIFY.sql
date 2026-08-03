select
  to_regclass('public.findat_ai_usage') as usage_table,
  c.relrowsecurity as row_level_security_enabled
from pg_class c
where c.oid = to_regclass('public.findat_ai_usage');

select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'findat_ai_usage'
order by policyname;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'findat_ai_usage'
order by indexname;
