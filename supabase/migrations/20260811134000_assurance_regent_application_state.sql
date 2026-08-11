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
