# FINDAT direct-message RLS fix

## Symptom

Sending a private message fails with:

`new row violates row-level security policy for table "findat_direct_messages"`

## Cause

The original INSERT policy validates the recipient with a direct query against
`public.findat_profiles`. That table's RLS allows a normal user to read only
his or her own profile. Consequently, the sender cannot see the recipient row
inside the policy, the `exists (...)` test becomes false, and PostgreSQL rejects
the new message.

## Deploy

1. Open Supabase Dashboard.
2. Open **SQL Editor**.
3. Paste and run `FINDAT-DIRECT-MESSAGE-RLS-FIX.sql`.
4. Confirm the verification query lists `findat members send own messages` with
   command `INSERT`.
5. Sign out and sign back in on two test accounts.
6. Send a message in both directions.

For Supabase CLI deployment, apply the new migration:

`supabase/migrations/20260803180000_findat_direct_messages_rls_fix.sql`

## Frontend hardening included

The integrated frontend now omits `sender_id` during insert and allows the
column's `default auth.uid()` to set it. This prevents stale client profile state
from supplying a sender ID that differs from the authenticated JWT user.
