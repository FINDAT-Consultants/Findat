-- Assurance Regent Supabase verification
select to_regclass('public.adra_recovery_state') as application_state_table,
       to_regclass('public.agent_memories') as agent_memories_table,
       to_regclass('public.agent_session_items') as agent_sessions_table,
       to_regclass('public.system_records') as system_records_table,
       to_regclass('public.agent_action_log') as agent_action_log_table,
       to_regclass('public.mts_work_sessions') as mts_work_sessions_table,
       to_regclass('public.mts_messages') as mts_messages_table,
       to_regclass('public.workbook_time_entries') as workbook_time_entries_table;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public'
  and c.relname like 'adra_recovery%'
   or (n.nspname='public' and c.relname in ('agent_memories','agent_session_items','system_records','agent_action_log','mts_work_sessions','mts_messages','workbook_time_entries'))
order by c.relname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('adra_recovery_state','agent_memories','agent_session_items','system_records','agent_action_log','mts_work_sessions','mts_messages','workbook_time_entries')
  and grantee in ('anon','authenticated','service_role')
order by table_name, grantee, privilege_type;
