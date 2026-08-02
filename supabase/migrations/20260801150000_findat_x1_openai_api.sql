-- FINDAT x1 | ProATR OpenAI integration
-- Additive migration: does not alter existing Writing Desk, collaboration,
-- messaging, publishing, course, profile or reconciliation records.

begin;

create table if not exists public.findat_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'openai' check (provider in ('openai')),
  model text not null default '',
  prompt_chars integer not null default 0 check (prompt_chars >= 0),
  response_chars integer not null default 0 check (response_chars >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  error_code text,
  openai_request_id text,
  created_at timestamptz not null default now()
);

create index if not exists findat_ai_usage_user_created_idx
  on public.findat_ai_usage (user_id, created_at desc);

create index if not exists findat_ai_usage_status_created_idx
  on public.findat_ai_usage (status, created_at desc);

alter table public.findat_ai_usage enable row level security;

revoke all on table public.findat_ai_usage from anon;
grant select on table public.findat_ai_usage to authenticated;

-- Users may inspect only their own metadata. Prompts and responses are never
-- stored in this table.
drop policy if exists "findat_ai_usage_select_own" on public.findat_ai_usage;
create policy "findat_ai_usage_select_own"
on public.findat_ai_usage
for select
to authenticated
using (user_id = auth.uid());

-- Administrators can inspect aggregate usage metadata through ordinary SQL or
-- future administrative reporting. The Edge Function writes with service role.
drop policy if exists "findat_ai_usage_admin_select" on public.findat_ai_usage;
create policy "findat_ai_usage_admin_select"
on public.findat_ai_usage
for select
to authenticated
using (
  exists (
    select 1
    from public.findat_profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.active = true
  )
);

comment on table public.findat_ai_usage is
  'Metadata-only audit and quota records for x1 OpenAI requests. No prompt or response body is stored.';

commit;
