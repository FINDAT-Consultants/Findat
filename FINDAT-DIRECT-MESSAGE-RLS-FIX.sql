-- Run this file once in Supabase Dashboard -> SQL Editor.
-- It repairs private-message inserts without exposing other users' profile rows.

begin;

alter table public.findat_direct_messages enable row level security;

drop policy if exists "findat members send own messages"
  on public.findat_direct_messages;

create policy "findat members send own messages"
on public.findat_direct_messages
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and sender_id = (select auth.uid())
  and public.findat_user_is_active((select auth.uid()))
  and recipient_id <> (select auth.uid())
  and public.findat_user_is_active(recipient_id)
);

grant insert on table public.findat_direct_messages to authenticated;

commit;

-- Verification: this should return one INSERT policy with the new expression.
select policyname, cmd, roles, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'findat_direct_messages'
order by policyname;
