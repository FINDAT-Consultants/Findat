-- Assurance Regent — Supabase-only persistent storage setup
-- Run this in Supabase Dashboard -> SQL Editor for the SAME Supabase project used by FINDAT/x1 | ProATR.
-- This script is non-destructive: it creates missing tables/indexes and locks them to server-side service-role access.
-- Browser clients must NOT receive SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.

begin;

-- ADRA Recovery Passport — workbook foundation storage
-- No end-user authentication is enabled in this prototype. These tables are intended
-- for server-side access with a Supabase secret/service-role credential. RLS is enabled
-- with no anonymous policies so browser clients cannot read the financial foundation directly.

create extension if not exists pgcrypto;

create table if not exists public.workbook_employees (
  employee_id text primary key,
  employee_name text not null,
  position text,
  supervisor text,
  hours_per_day numeric(8,2),
  start_date date,
  end_date date,
  active text,
  source_sheet text not null default 'Employees'
);

create table if not exists public.workbook_projects (
  project_code text primary key,
  project_name text,
  donor text,
  start_date date,
  end_date date,
  status text,
  admin_allowed text,
  personnel_budget_ugx numeric(18,2),
  eligible_employee_id text,
  source_sheet text not null default 'Projects'
);

create table if not exists public.workbook_payroll (
  month date not null,
  employee_id text not null,
  basic_salary_ugx numeric(18,2) not null default 0,
  benefits numeric(18,2) not null default 0,
  statutory_cost numeric(18,2) not null default 0,
  exclusions numeric(18,2) not null default 0,
  allocable_cost numeric(18,2) generated always as (basic_salary_ugx + benefits + statutory_cost - exclusions) stored,
  source text,
  configuration_status text,
  notes text,
  primary key(month, employee_id)
);

create table if not exists public.workbook_calendar (
  work_date date primary key,
  month date not null,
  day_name text,
  day_type text,
  standard_hours numeric(8,2) not null default 0,
  holiday_source text
);

create table if not exists public.workbook_time_entries (
  entry_id text primary key,
  work_date date not null,
  month date not null,
  employee_id text not null,
  employee_name text,
  project_code text not null,
  activity_evidence text,
  hours numeric(8,2) not null,
  time_type text,
  status text,
  ai_suggested_project text,
  ai_confidence numeric(8,6),
  employee_decision text,
  source_daily_total numeric(8,2),
  source_daily_check text,
  source_project_eligibility text,
  source_ai_coding_check text,
  source_entry_assurance text
);
create index if not exists workbook_time_entries_month_idx on public.workbook_time_entries(month);
create index if not exists workbook_time_entries_project_idx on public.workbook_time_entries(project_code, month);

create table if not exists public.workbook_source_checks (
  month date primary key,
  check_name text,
  source_target numeric(12,4),
  severity text,
  where_to_fix text
);

create table if not exists public.workbook_sources (
  id bigint generated always as identity primary key,
  item text,
  value text,
  units text,
  period_as_of text,
  source_type text,
  source_name text,
  reference text,
  owner text,
  status text,
  notes text
);

create table if not exists public.workbook_formula_catalog (
  id bigint generated always as identity primary key,
  sheet_name text not null,
  field_name text not null,
  excel_formula text not null,
  application_logic text not null
);

create table if not exists public.agent_learning_mappings (
  id uuid primary key default gen_random_uuid(),
  activity_key text not null,
  activity_example text not null,
  project_code text not null,
  accepted_count integer not null default 1,
  confirmed_by text not null default 'human',
  note text,
  created_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  unique(activity_key, project_code)
);

create table if not exists public.workbook_engine_metadata (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- The current prototype does not expose Supabase directly to browser users.
-- The server can access these tables with a secret/service-role credential.
alter table public.workbook_employees enable row level security;
alter table public.workbook_projects enable row level security;
alter table public.workbook_payroll enable row level security;
alter table public.workbook_calendar enable row level security;
alter table public.workbook_time_entries enable row level security;
alter table public.workbook_source_checks enable row level security;
alter table public.workbook_sources enable row level security;
alter table public.workbook_formula_catalog enable row level security;
alter table public.agent_learning_mappings enable row level security;
alter table public.workbook_engine_metadata enable row level security;


-- ADRA Recovery Passport — persistent agent memory, sessions, stored records and audit actions
-- Prototype mode has no browser sign-in. These tables are intended to be accessed server-side
-- through the application's Supabase secret/service role. Add RLS policies when user auth is enabled.

create table if not exists public.agent_memories (
  id bigint generated by default as identity primary key,
  title text not null,
  content text not null,
  category text not null default 'fact',
  authority text not null default 'CONFIRMED',
  importance numeric(4,3) not null default 0.700 check (importance >= 0 and importance <= 1),
  source_type text not null default 'system',
  source_ref text not null default '',
  tags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  session_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  use_count integer not null default 0
);

create index if not exists agent_memories_category_idx on public.agent_memories(category);
create index if not exists agent_memories_authority_idx on public.agent_memories(authority);
create index if not exists agent_memories_updated_idx on public.agent_memories(updated_at desc);

create table if not exists public.agent_session_items (
  id bigint generated by default as identity primary key,
  session_id text not null,
  sequence bigint not null,
  item jsonb not null,
  created_at timestamptz not null default now(),
  unique(session_id, sequence)
);
create index if not exists agent_session_items_session_idx on public.agent_session_items(session_id, sequence);

create table if not exists public.system_records (
  id bigint generated by default as identity primary key,
  record_type text not null default 'note',
  title text not null,
  content text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'system',
  session_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists system_records_type_idx on public.system_records(record_type);
create index if not exists system_records_status_idx on public.system_records(status);
create index if not exists system_records_updated_idx on public.system_records(updated_at desc);

create table if not exists public.agent_action_log (
  id bigint generated by default as identity primary key,
  session_id text not null default '',
  action_name text not null,
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
create index if not exists agent_action_log_created_idx on public.agent_action_log(created_at desc);
create index if not exists agent_action_log_session_idx on public.agent_action_log(session_id, created_at desc);

-- Initial durable design memory. Numeric calculations still come from the deterministic engine.
insert into public.agent_memories(title,content,category,authority,importance,source_type,source_ref,tags)
select * from (values
  ('Recovery Passport five-key gate', 'A proposed personnel charge is recoverable only when Evidence, Capacity, Eligibility, Budget and Approval all pass. One failed key blocks posting while the underlying cost remains visible.', 'policy', 'FOUNDATIONAL', 1.000, 'source_document', 'Cost Recovery.docx', '["recovery passport","control gate"]'::jsonb),
  ('Deterministic financial authority', 'Hours, payroll allocation, eligibility, formula results, posting status, Recovery Gate and voucher amounts must come from the embedded deterministic workbook engine rather than model invention.', 'policy', 'FOUNDATIONAL', 1.000, 'system_design', 'Workbook engine', '["authority","calculation"]'::jsonb),
  ('AI role boundary', 'AI may suggest projects, classify activities, explain exceptions, detect unusual patterns, draft follow-ups and summarize risks. AI may not change hours, approve time, determine salary, override donor restrictions or authorize journal entries.', 'policy', 'FOUNDATIONAL', 1.000, 'source_document', 'Cost Recovery.docx', '["AI","controls"]'::jsonb),
  ('Learning from confirmed decisions', 'The application may learn from repeated human-confirmed activity coding decisions, but it must continue to show the suggestion and confidence instead of silently posting a learned code.', 'lesson', 'FOUNDATIONAL', 0.950, 'source_document', 'Cost Recovery.docx', '["learning","coding"]'::jsonb)
) as v(title,content,category,authority,importance,source_type,source_ref,tags)
where not exists (select 1 from public.agent_memories m where m.title=v.title);

-- Server-only persistence boundary. Browser roles have no direct table access.
alter table public.agent_memories enable row level security;
alter table public.agent_session_items enable row level security;
alter table public.system_records enable row level security;
alter table public.agent_action_log enable row level security;

revoke all on table public.agent_memories from anon, authenticated;
revoke all on table public.agent_session_items from anon, authenticated;
revoke all on table public.system_records from anon, authenticated;
revoke all on table public.agent_action_log from anon, authenticated;

grant all on table public.agent_memories to service_role;
grant all on table public.agent_session_items to service_role;
grant all on table public.system_records to service_role;
grant all on table public.agent_action_log to service_role;


-- ADRA Recovery Passport + Master Time Schedule integration
-- The MTS work session is the operational evidence record. Completed sessions create DRAFT
-- Recovery Passport time entries; human approval remains separate.

create table if not exists public.mts_work_sessions (
  id text primary key,
  employee_id text not null,
  employee_name text not null,
  department text,
  project_code text not null,
  activity_description text not null,
  work_date date not null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  duration_hours numeric(12,6) not null default 0,
  completion_percent numeric(6,2) not null default 0,
  on_time boolean not null default false,
  delay_comments text,
  clock_in_location text,
  clock_out_location text,
  clock_in_lat numeric(10,7),
  clock_in_lng numeric(10,7),
  clock_out_lat numeric(10,7),
  clock_out_lng numeric(10,7),
  document_name text,
  document_type text,
  document_size bigint not null default 0,
  document_data text,
  status text not null default 'active' check (status in ('active','completed')),
  locked boolean not null default false,
  recovery_entry_id text,
  recovery_bridge_status text not null default 'pending_clock_out',
  source text not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mts_work_sessions_work_date_idx on public.mts_work_sessions(work_date);
create index if not exists mts_work_sessions_project_idx on public.mts_work_sessions(project_code, work_date);
create index if not exists mts_work_sessions_employee_idx on public.mts_work_sessions(employee_id, work_date);
create index if not exists mts_work_sessions_status_idx on public.mts_work_sessions(status);

create table if not exists public.mts_messages (
  id text primary key,
  recipient text not null,
  sender text not null default 'Recovery Passport System',
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mts_messages_recipient_idx on public.mts_messages(recipient, created_at desc);

alter table public.mts_work_sessions enable row level security;
alter table public.mts_messages enable row level security;

-- This prototype uses server-side Supabase credentials and therefore does not expose these
-- tables directly to the browser. Add authenticated-user RLS policies when account creation is enabled.

comment on table public.mts_work_sessions is 'Operational work-evidence spine linking clock-in/out activity evidence to draft Recovery Passport time entries.';
comment on column public.mts_work_sessions.recovery_entry_id is 'Links a completed MTS session to the corresponding draft time entry in workbook_time_entries.';


-- Assurance Regent server-side application state.
-- This table is intentionally service-role only: browser clients must never read or write it directly.
create table if not exists public.adra_recovery_state (
  scope text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.adra_recovery_state enable row level security;
revoke all on table public.adra_recovery_state from anon, authenticated;
grant all on table public.adra_recovery_state to service_role;

comment on table public.adra_recovery_state is
  'Server-side Assurance Regent state snapshots. Access is restricted to the Supabase service role.';

-- Defense in depth: no direct browser role can access Assurance Regent persistence tables.
revoke all on table public.workbook_employees from anon, authenticated;
revoke all on table public.workbook_projects from anon, authenticated;
revoke all on table public.workbook_payroll from anon, authenticated;
revoke all on table public.workbook_calendar from anon, authenticated;
revoke all on table public.workbook_time_entries from anon, authenticated;
revoke all on table public.workbook_source_checks from anon, authenticated;
revoke all on table public.workbook_sources from anon, authenticated;
revoke all on table public.workbook_formula_catalog from anon, authenticated;
revoke all on table public.agent_learning_mappings from anon, authenticated;
revoke all on table public.workbook_engine_metadata from anon, authenticated;
revoke all on table public.agent_memories from anon, authenticated;
revoke all on table public.agent_session_items from anon, authenticated;
revoke all on table public.system_records from anon, authenticated;
revoke all on table public.agent_action_log from anon, authenticated;
revoke all on table public.mts_work_sessions from anon, authenticated;
revoke all on table public.mts_messages from anon, authenticated;
revoke all on table public.adra_recovery_state from anon, authenticated;

grant usage on schema public to service_role;
grant all on table public.workbook_employees to service_role;
grant all on table public.workbook_projects to service_role;
grant all on table public.workbook_payroll to service_role;
grant all on table public.workbook_calendar to service_role;
grant all on table public.workbook_time_entries to service_role;
grant all on table public.workbook_source_checks to service_role;
grant all on table public.workbook_sources to service_role;
grant all on table public.workbook_formula_catalog to service_role;
grant all on table public.agent_learning_mappings to service_role;
grant all on table public.workbook_engine_metadata to service_role;
grant all on table public.agent_memories to service_role;
grant all on table public.agent_session_items to service_role;
grant all on table public.system_records to service_role;
grant all on table public.agent_action_log to service_role;
grant all on table public.mts_work_sessions to service_role;
grant all on table public.mts_messages to service_role;
grant all on table public.adra_recovery_state to service_role;
grant usage, select on all sequences in schema public to service_role;

commit;

-- Verification: these should all return true for RLS.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public'
  and c.relname in (
    'workbook_employees','workbook_projects','workbook_payroll','workbook_calendar',
    'workbook_time_entries','workbook_source_checks','workbook_sources','workbook_formula_catalog',
    'agent_learning_mappings','workbook_engine_metadata','agent_memories','agent_session_items',
    'system_records','agent_action_log','mts_work_sessions','mts_messages','adra_recovery_state'
  )
order by c.relname;
