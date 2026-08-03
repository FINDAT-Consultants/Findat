# FINDAT Supabase Auth, Postgres and role deployment

This package adds the public header login controls and moves FINDAT account and
article workflow data to Supabase Auth and Postgres.

## What is stored where

- Passwords and sessions: **Supabase Auth** (`auth.users`). Passwords are never
  written to a public FINDAT table or to frontend JavaScript.
- Usernames, names, roles and account status: `public.findat_profiles`.
- Articles, assignments and approval status: `public.findat_articles`.
- Activity records: `public.findat_audit_log`.
- Cloud desktop documents and wallpaper settings remain in the existing
  `findat-documents` Storage bucket.

## Role rules

| Role | Account creation | Article privileges | Approval |
|---|---|---|---|
| Client | Can self-register as Client only | Write and edit only their own article text; submit for approval; cannot assign Consultants, change article media, delete, approve or publish | No |
| Consultant | Created by an Administrator | Base role: edit/proofread assigned work. After the collaboration upgrade, a Consultant may also edit accepted collaborative papers and may publish only articles explicitly delegated by an Administrator; there is no general Publish button. | No |
| Administrator | One-time secure bootstrap only; not available in registration or the account-creation role selector | Full article control; creates Consultant and Client accounts; changes their passwords; suspends/reactivates them | Yes |

Administrator registry rows are grey and protected. The web account-control
screen cannot create, suspend, alter or replace the password of an Administrator.
Use the normal secure recovery flow for the Administrator's own password.

## 1. Apply the database migration

Open **Supabase Dashboard → SQL Editor**, paste the full contents of:

```text
FINDAT-AUTH-RBAC-POSTGRES-SETUP.sql
```

Run it once. The same migration is also available at:

```text
supabase/migrations/20260727110000_findat_auth_rbac_postgres.sql
```

## 2. Deploy the Edge Functions

From a trusted computer with the Supabase CLI logged into this project:

```bash
supabase link --project-ref gmiqvpemuabjueyprwyl
supabase functions deploy findat-username-login --no-verify-jwt
supabase functions deploy findat-admin-users --no-verify-jwt
supabase functions deploy findat-bootstrap-admin --no-verify-jwt
```

The functions validate credentials or an Administrator session inside the
function. Supabase service-role/secret credentials stay in the function runtime
and must never be copied into `findat-auth-config.js`, `cloud-config.js`, HTML or
browser JavaScript.

## 3. Create the first Administrator securely

Follow `ADMIN-BOOTSTRAP-EXAMPLE.txt`. Use a new strong password. Do **not** reuse
any password that was previously present in frontend files.

After the first Administrator is created, remove the one-time bootstrap secret.
The bootstrap function refuses to create another Administrator when one already
exists.

## 4. Configure authentication URLs

In **Authentication → URL Configuration**:

1. Set **Site URL** to the deployed FINDAT website origin and path.
2. Add the same deployed URL to **Redirect URLs**.
3. For local testing, add the exact localhost URL being used.

The browser app redirects recovery links to the deployed page and listens for Supabase's `PASSWORD_RECOVERY` event to open the new-password form. Do not leave the production Site URL set to localhost.

## 5. Configure recovery email

In **Authentication → Email Templates → Reset Password**, paste:

```text
SUPABASE-RECOVERY-EMAIL-TEMPLATE.html
```

The template includes the stored username and a secure password-reset link. For
production delivery, configure a trusted SMTP provider in Supabase.

## 6. Deploy the website

Deploy the complete package, including:

```text
findat-auth-config.js
assets/data/页面7.fdx
assets/data/样式8.fdx
assets/data/逻辑9.fdx
supabase/functions/
```

Then hard-refresh desktop browsers with `Ctrl + Shift + R`. On phones, close and
reopen the site or clear the site's cached data once.

## 7. Acceptance tests

1. Register publicly and confirm the new account is always a Client.
2. Confirm Admin and Consultant registration choices are grey and disabled.
3. Log in with either username or email plus password.
4. Use **Forgot Username or Password** and confirm the recovery email contains
   the username and reset link.
5. As a Client, create an article and submit it; confirm publishing controls are
   unavailable.
6. As an Administrator, create a Consultant, assign the Consultant to an article,
   and change a Client or Consultant password.
7. As the Consultant, confirm only the assigned Client article can be edited and
   that approval/publishing controls are unavailable.
8. As the Administrator, approve and publish the article.
9. Confirm an Administrator registry row is grey and has only a disabled
   **Protected** control.

## Important storage boundary

This migration secures the website account/article workflow. The existing Cloud
Storage setup still uses its prior shared Storage policies. Before storing
private per-client documents, replace those anonymous Storage policies with
owner- or workspace-scoped policies tied to `auth.uid()`.

## Client login repair

The current build includes a Client-login repair in `CLIENT-LOGIN-FIX.md`. Deploy the updated `findat-username-login` and `findat-admin-users` functions, then use the Administrator **User Accounts** registry to confirm any older unconfirmed Client email or replace the Client password.


> The later `FINDAT-COLLABORATION-PUBLISHING-UPGRADE.sql` migration extends this base model with five-person collaboration and article-specific delegated Consultant publishing.
