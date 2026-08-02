# Public registration approval deployment

The interface now shows a successful-account popup after registration and signs the new user out. New public Client and Google registrations must remain inactive until an Administrator reviews and confirms them.

## Required Supabase step

Run `FINDAT-PUBLIC-REGISTRATION-APPROVAL-UPGRADE.sql` in **Supabase Dashboard -> SQL Editor**.

This upgrade:

- leaves existing active accounts unchanged;
- creates new public registrations with `active = false`;
- keeps Administrator-created accounts active;
- allows the Administrator to approve an account using **Writing Desk -> User Accounts -> Activate/Confirm**.

Redeploy `findat-username-login` from `supabase/functions/findat-username-login/index.ts` so pending users receive the updated review message.
