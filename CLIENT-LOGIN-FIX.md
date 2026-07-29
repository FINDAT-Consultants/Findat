# FINDAT Client Login Fix

This update repairs the difference between Administrator login and Client login.

## What changed

- The username login function now identifies an unconfirmed Client email instead of always returning a generic password error.
- Older Supabase Auth users whose `findat_profiles` row was not created are repaired automatically.
- The Administrator account registry now shows **Email confirmed** or **Email unconfirmed**.
- Administrators can click **Confirm email** for an existing Client or Consultant.
- Changing a Client or Consultant password also confirms and activates that account.
- Administrator-created accounts remain confirmed immediately.

## Deploy the two Edge Functions

In Supabase Dashboard, replace the code of these existing functions with the matching files under `supabase/dashboard-functions/`:

1. `findat-username-login`
2. `findat-admin-users`

Function settings:

| Function | Verify JWT |
|---|---|
| `findat-username-login` | OFF |
| `findat-admin-users` | ON |

Deploy both functions after replacing their code.

## Deploy the website

Deploy the full contents of this package to Netlify, replacing the previous FINDAT build. Then hard-refresh with `Ctrl + Shift + R`.

## Repair an existing Client

1. Log in as Administrator.
2. Open **User Accounts**.
3. Click **Refresh**.
4. Find the Client account.
5. If it says **Email unconfirmed**, click **Confirm email**.
6. If the password is uncertain, click **Password** and enter a new password. This also confirms and activates the account.
7. Log out and test the Client username and password.

## Optional database check

Run this read-only query in SQL Editor to see the state of every account:

```sql
select
  u.id,
  u.email,
  u.email_confirmed_at,
  u.last_sign_in_at,
  p.username,
  p.role,
  p.active
from auth.users u
left join public.findat_profiles p on p.id = u.id
order by u.created_at desc;
```

Do not store or update passwords in SQL. Supabase Auth continues to handle password hashes.
