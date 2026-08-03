-- FINDAT x1 | ProATR OpenAI integration
-- Additive/idempotent upgrade: enables anonymous x1 chat without requiring a
-- FINDAT login, while keeping the OpenAI key inside Supabase Edge Secrets.
-- Existing Writing Desk, collaboration, messaging, publishing, course,
-- profile and reconciliation records are not removed or replaced.

begin;

create table if not exists public.findat_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_hash text not null default '',
  access_type text not null default 'anonymous',
  provider text not null default 'openai',
  model text not null default '',
  prompt_chars integer not null default 0,
  response_chars integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  status text not null default 'started',
  error_code text,
  openai_request_id text,
  created_at timestamptz not null default now()
);

-- Upgrade databases that previously used authenticated-only x1 usage rows.
alter table public.findat_ai_usage
  alter column user_id drop not null;

alter table public.findat_ai_usage
  add column if not exists client_hash text not null default '',
  add column if not exists access_type text not null default 'authenticated';

update public.findat_ai_usage
set access_type = case when user_id is null then 'anonymous' else 'authenticated' end
where access_type is null
   or access_type not in ('authenticated', 'anonymous');

alter table public.findat_ai_usage
  drop constraint if exists findat_ai_usage_provider_check,
  drop constraint if exists findat_ai_usage_prompt_chars_check,
  drop constraint if exists findat_ai_usage_response_chars_check,
  drop constraint if exists findat_ai_usage_input_tokens_check,
  drop constraint if exists findat_ai_usage_output_tokens_check,
  drop constraint if exists findat_ai_usage_total_tokens_check,
  drop constraint if exists findat_ai_usage_status_check,
  drop constraint if exists findat_ai_usage_access_type_check,
  drop constraint if exists findat_ai_usage_identity_check;

alter table public.findat_ai_usage
  add constraint findat_ai_usage_provider_check
    check (provider in ('openai')),
  add constraint findat_ai_usage_prompt_chars_check
    check (prompt_chars >= 0),
  add constraint findat_ai_usage_response_chars_check
    check (response_chars >= 0),
  add constraint findat_ai_usage_input_tokens_check
    check (input_tokens >= 0),
  add constraint findat_ai_usage_output_tokens_check
    check (output_tokens >= 0),
  add constraint findat_ai_usage_total_tokens_check
    check (total_tokens >= 0),
  add constraint findat_ai_usage_status_check
    check (status in ('started', 'completed', 'failed')),
  add constraint findat_ai_usage_access_type_check
    check (access_type in ('authenticated', 'anonymous')),
  add constraint findat_ai_usage_identity_check
    check (
      (user_id is not null and access_type = 'authenticated')
      or
      (user_id is null and access_type = 'anonymous' and length(client_hash) >= 32)
    );

create index if not exists findat_ai_usage_user_created_idx
  on public.findat_ai_usage (user_id, created_at desc)
  where user_id is not null;

create index if not exists findat_ai_usage_client_created_idx
  on public.findat_ai_usage (client_hash, created_at desc)
  where user_id is null;

create index if not exists findat_ai_usage_status_created_idx
  on public.findat_ai_usage (status, created_at desc);

alter table public.findat_ai_usage enable row level security;

revoke all on table public.findat_ai_usage from anon;
grant select on table public.findat_ai_usage to authenticated;

-- Signed-in users can inspect only their own metadata. Anonymous fingerprints,
-- prompts and response bodies are never exposed to browsers.
drop policy if exists "findat_ai_usage_select_own" on public.findat_ai_usage;
create policy "findat_ai_usage_select_own"
on public.findat_ai_usage
for select
to authenticated
using (user_id = auth.uid());

-- Active administrators may inspect usage metadata for operational reporting.
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

-- Atomically claims a quota slot before an OpenAI request is sent. The
-- transaction-level advisory lock prevents parallel requests from racing past
-- the same limit. Abandoned "started" rows stop counting after 15 minutes.
create or replace function public.findat_claim_ai_quota(
  p_user_id uuid,
  p_client_hash text,
  p_access_type text,
  p_hourly_limit integer,
  p_daily_limit integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identity text;
  v_hour_count integer;
  v_day_count integer;
  v_usage_id uuid;
begin
  if p_access_type not in ('authenticated', 'anonymous') then
    raise exception using message = 'INVALID_ACCESS_TYPE', errcode = 'P0001';
  end if;

  if p_access_type = 'authenticated' then
    if p_user_id is null then
      raise exception using message = 'IDENTITY_REQUIRED', errcode = 'P0001';
    end if;
    v_identity := 'user:' || p_user_id::text;
  else
    if p_user_id is not null or coalesce(length(p_client_hash), 0) < 32 then
      raise exception using message = 'IDENTITY_REQUIRED', errcode = 'P0001';
    end if;
    v_identity := 'anonymous:' || p_client_hash;
  end if;

  p_hourly_limit := greatest(1, least(coalesce(p_hourly_limit, 1), 5000));
  p_daily_limit := greatest(p_hourly_limit, least(coalesce(p_daily_limit, p_hourly_limit), 50000));

  perform pg_advisory_xact_lock(hashtextextended(v_identity, 18473));

  select count(*)::integer
  into v_hour_count
  from public.findat_ai_usage u
  where (
      (p_access_type = 'authenticated' and u.user_id = p_user_id)
      or
      (p_access_type = 'anonymous' and u.user_id is null and u.client_hash = p_client_hash)
    )
    and u.created_at >= now() - interval '1 hour'
    and (
      u.status in ('completed', 'failed')
      or (u.status = 'started' and u.created_at >= now() - interval '15 minutes')
    );

  if v_hour_count >= p_hourly_limit then
    raise exception using message = 'HOURLY_LIMIT', errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_day_count
  from public.findat_ai_usage u
  where (
      (p_access_type = 'authenticated' and u.user_id = p_user_id)
      or
      (p_access_type = 'anonymous' and u.user_id is null and u.client_hash = p_client_hash)
    )
    and u.created_at >= now() - interval '24 hours'
    and (
      u.status in ('completed', 'failed')
      or (u.status = 'started' and u.created_at >= now() - interval '15 minutes')
    );

  if v_day_count >= p_daily_limit then
    raise exception using message = 'DAILY_LIMIT', errcode = 'P0001';
  end if;

  insert into public.findat_ai_usage (
    user_id,
    client_hash,
    access_type,
    provider,
    status
  ) values (
    p_user_id,
    case when p_access_type = 'anonymous' then p_client_hash else '' end,
    p_access_type,
    'openai',
    'started'
  )
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

revoke all on function public.findat_claim_ai_quota(uuid, text, text, integer, integer) from public;
revoke all on function public.findat_claim_ai_quota(uuid, text, text, integer, integer) from anon;
revoke all on function public.findat_claim_ai_quota(uuid, text, text, integer, integer) from authenticated;
grant execute on function public.findat_claim_ai_quota(uuid, text, text, integer, integer) to service_role;

comment on table public.findat_ai_usage is
  'Metadata-only audit and quota records for authenticated and anonymous x1 OpenAI requests. No prompt or response body is stored.';

comment on function public.findat_claim_ai_quota(uuid, text, text, integer, integer) is
  'Service-role-only atomic quota claim for x1 OpenAI requests.';

commit;
