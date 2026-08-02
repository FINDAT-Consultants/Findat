# FINDAT Registration Email Rate-Limit Fix

## Why registration failed

Supabase's built-in Auth mailer is intended for testing and permits only a very small number of authentication emails. When **Confirm email** is enabled, every password registration attempts to send an email. Once the project-wide allowance is reached, Supabase returns `email rate limit exceeded`.

FINDAT already uses a separate Administrator approval gate: new public Client accounts are created with `active = false` and cannot log in until an Administrator selects **Approve / Activate**. Therefore, email confirmation is not required for the registration gate.

## Required hosted Supabase setting

1. Open the FINDAT project in Supabase Dashboard.
2. Go to **Authentication**.
3. Open **Providers** and select **Email**.
4. Keep **Allow new users to sign up** enabled.
5. Turn **Confirm email** off.
6. Save the provider settings.

With this setting disabled, Supabase creates the Auth user without attempting to send a signup-confirmation email. FINDAT immediately signs out the temporary signup session and the new profile remains pending Administrator approval.

## Administrator approval remains required

Run `FINDAT-PUBLIC-REGISTRATION-APPROVAL-UPGRADE.sql` once if it has not already been deployed. The migration keeps new public profiles inactive until an Administrator approves them.

## Password recovery emails

Disabling signup confirmation does not remove password recovery. Recovery still sends email. For reliable production password recovery and future email notifications, configure a custom SMTP provider under the Supabase Authentication settings.

## Interface safeguards included in this build

- Supabase error objects are converted into readable text; an empty `{ }` is never shown.
- Email rate-limit errors have a clear user-facing explanation.
- Registration fields remain filled when a request fails.
- Repeated clicks are blocked while registration is running.
- The form clears only after an account is created successfully.
- Administrator approval and all existing account controls remain unchanged.

## Verification

1. Open registration in a private browser window.
2. Register a new Client with an unused email and username.
3. Confirm that the success popup appears.
4. Attempt to log in before approval; access must be refused.
5. In the Administrator account registry, select **Approve / Activate**.
6. Log in with the new account.
