-- FINDAT x1 low-token controls and private-chat clearing
-- Additive migration. Existing accounts, publications, messages, x1 knowledge,
-- reconciliation data and other application records are not modified.

begin;

-- -----------------------------------------------------------------------------
-- 1. Administrator-controlled x1/OpenAI runtime policy
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_runtime_settings (
  id smallint primary key default 1 check (id = 1),
  openai_enabled boolean not null default true,
  guest_openai_enabled boolean not null default true,
  prefer_local_for_simple boolean not null default true,
  reasoning_effort text not null default 'none' check (reasoning_effort in ('none', 'low')),
  max_output_tokens integer not null default 420 check (max_output_tokens between 128 and 1200),
  response_word_limit integer not null default 240 check (response_word_limit between 80 and 650),
  signed_prompt_chars integer not null default 4500 check (signed_prompt_chars between 1000 and 12000),
  guest_prompt_chars integer not null default 1800 check (guest_prompt_chars between 500 and 6000),
  evidence_items integer not null default 5 check (evidence_items between 1 and 12),
  evidence_chars integer not null default 1000 check (evidence_chars between 400 and 2500),
  conversation_turns integer not null default 3 check (conversation_turns between 0 and 8),
  signed_hourly_limit integer not null default 8 check (signed_hourly_limit between 1 and 100),
  signed_daily_limit integer not null default 28 check (signed_daily_limit between 1 and 500),
  guest_hourly_limit integer not null default 3 check (guest_hourly_limit between 1 and 30),
  guest_daily_limit integer not null default 8 check (guest_daily_limit between 1 and 100),
  signed_cooldown_seconds integer not null default 15 check (signed_cooldown_seconds between 0 and 300),
  guest_cooldown_seconds integer not null default 45 check (guest_cooldown_seconds between 0 and 600),
  signed_daily_token_budget integer not null default 90000 check (signed_daily_token_budget between 1000 and 2000000),
  guest_daily_token_budget integer not null default 12000 check (guest_daily_token_budget between 1000 and 200000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.findat_x1_runtime_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.findat_touch_x1_runtime_settings()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  new.id = 1;
  return new;
end;
$$;

drop trigger if exists findat_touch_x1_runtime_settings on public.findat_x1_runtime_settings;
create trigger findat_touch_x1_runtime_settings
before update on public.findat_x1_runtime_settings
for each row execute function public.findat_touch_x1_runtime_settings();

alter table public.findat_x1_runtime_settings enable row level security;
revoke all on table public.findat_x1_runtime_settings from public, anon;
grant select, insert, update on table public.findat_x1_runtime_settings to authenticated;

drop policy if exists "findat_x1_settings_admin_select" on public.findat_x1_runtime_settings;
create policy "findat_x1_settings_admin_select"
on public.findat_x1_runtime_settings
for select to authenticated
using (public.findat_is_admin());

drop policy if exists "findat_x1_settings_admin_insert" on public.findat_x1_runtime_settings;
create policy "findat_x1_settings_admin_insert"
on public.findat_x1_runtime_settings
for insert to authenticated
with check (public.findat_is_admin() and id = 1 and updated_by = auth.uid());

drop policy if exists "findat_x1_settings_admin_update" on public.findat_x1_runtime_settings;
create policy "findat_x1_settings_admin_update"
on public.findat_x1_runtime_settings
for update to authenticated
using (public.findat_is_admin())
with check (public.findat_is_admin() and id = 1 and updated_by = auth.uid());

comment on table public.findat_x1_runtime_settings is
  'Single-row Administrator policy enforced by the findat-x1-openai Edge Function.';

-- -----------------------------------------------------------------------------
-- 2. Per-user private-message clear markers
-- Clearing hides older messages only for the user who clears the conversation.
-- It does not delete the other participant's copy or alter message records.
-- -----------------------------------------------------------------------------

create table if not exists public.findat_message_clears (
  user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key (user_id, other_user_id),
  constraint findat_message_clears_distinct_users check (user_id <> other_user_id)
);

create index if not exists findat_message_clears_user_idx
  on public.findat_message_clears (user_id, cleared_at desc);

alter table public.findat_message_clears enable row level security;
revoke all on table public.findat_message_clears from public, anon;
grant select, insert, update, delete on table public.findat_message_clears to authenticated;

drop policy if exists "findat_message_clears_select_own" on public.findat_message_clears;
create policy "findat_message_clears_select_own"
on public.findat_message_clears
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "findat_message_clears_insert_own" on public.findat_message_clears;
create policy "findat_message_clears_insert_own"
on public.findat_message_clears
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "findat_message_clears_update_own" on public.findat_message_clears;
create policy "findat_message_clears_update_own"
on public.findat_message_clears
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "findat_message_clears_delete_own" on public.findat_message_clears;
create policy "findat_message_clears_delete_own"
on public.findat_message_clears
for delete to authenticated
using (user_id = auth.uid());

comment on table public.findat_message_clears is
  'Per-user private-conversation visibility cutoffs. Original messages remain intact.';

commit;
