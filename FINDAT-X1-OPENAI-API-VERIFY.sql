-- Verify the public/no-login x1 OpenAI database upgrade.

select
  to_regclass('public.findat_ai_usage') as usage_table,
  c.relrowsecurity as row_level_security_enabled
from pg_class c
where c.oid = to_regclass('public.findat_ai_usage');

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'findat_ai_usage'
  and column_name in ('user_id', 'client_hash', 'access_type', 'status')
order by ordinal_position;

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'findat_ai_usage'
order by policyname;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'findat_ai_usage'
order by indexname;

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'findat_claim_ai_quota';
