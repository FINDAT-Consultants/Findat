# FINDAT automatic Client registration deployment

This update removes the Administrator-confirmation requirement for new public Client accounts.

## 1. Run the SQL migration

In **Supabase Dashboard -> SQL Editor**, run:

`FINDAT-AUTOMATIC-CLIENT-REGISTRATION-UPGRADE.sql`

It will:

- activate new email/password and Google Client registrations immediately;
- activate public Client accounts still pending under the old approval workflow;
- keep Administrator registration notifications as informational alerts;
- remove the Review account requirement from new registration notifications;
- leave Administrator and Consultant role creation under Administrator control.

## 2. Redeploy the username-login function

Redeploy:

`supabase/functions/findat-username-login/index.ts`

The function now treats inactive profiles only as suspended accounts, not accounts awaiting approval.

## 3. Supabase email setting

To avoid the built-in authentication email rate limit, keep:

- **Authentication -> Providers -> Email -> Allow new users to sign up: ON**
- **Authentication -> Providers -> Email -> Confirm email: OFF**

With Confirm email off, successful email/password registration returns a session and FINDAT opens the new Client account immediately. Google registrations also open immediately after OAuth completes.

## Result

1. A Client registers.
2. Supabase creates the Auth user.
3. FINDAT creates an active Client profile.
4. The Client can use FINDAT immediately.
5. Administrators receive an informational notification only; no approval is required.
