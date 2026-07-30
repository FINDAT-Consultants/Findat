# FINDAT Supabase Email OTP — No SMTP Setup

This build adds a six-digit email-code login, account-confirmation codes, and password-recovery codes while preserving password and Google sign-in.

## Important

Supabase generates and verifies every OTP. The browser never creates or stores the code. Because you do not want SMTP, the supplied **Auth Send Email Hook** sends Supabase-generated codes through the Resend HTTPS API.

You do not need to edit the read-only **Magic link or OTP** template in Supabase. Once the Send Email Hook is enabled, the hook replaces the built-in email sender.

## 1. Create a Resend API key

1. Create a Resend account.
2. For testing, Resend's onboarding sender normally sends only to the account owner's email.
3. To send OTPs to every FINDAT user, verify a sending domain in Resend.
4. Create an API key and keep it private.

## 2. Create the Edge Function

In Supabase Dashboard:

1. Open **Edge Functions → Functions**.
2. Create a new function from **Simple Hello World**.
3. Name it exactly: `findat-send-auth-email`.
4. Delete the sample code.
5. Paste all code from `findat-send-auth-email.ts`.
6. Deploy the function.
7. In the function settings, set **Verify JWT** to **OFF**. The Auth Hook is authenticated with a signed webhook secret instead.

## 3. Add the Resend secret

Open **Edge Functions → Secrets** and add:

- Name: `RESEND_API_KEY`
- Value: your private Resend API key

For testing, also add:

- Name: `FINDAT_AUTH_FROM_EMAIL`
- Value: `FINDAT Consultants <onboarding@resend.dev>`

After verifying your domain, replace that value with an address on your domain, for example:

`FINDAT Consultants <no-reply@yourdomain.com>`

## 4. Create the Supabase Auth Send Email Hook

1. Open **Authentication → Auth Hooks**.
2. Create a **Send Email** hook.
3. Select **HTTPS**.
4. Enter this URL:

`https://gmiqvpemuabjueyprwyl.supabase.co/functions/v1/findat-send-auth-email`

5. Click **Generate Secret**.
6. Copy the generated value, including its `v1,whsec_` prefix.
7. Save/create the hook.
8. Return to **Edge Functions → Secrets** and add:

- Name: `SEND_EMAIL_HOOK_SECRET`
- Value: the complete generated hook secret

Redeploy the function once after both secrets are present.

## 5. Keep the Email provider enabled

Open **Authentication → Sign In / Providers → Email** and leave the Email provider enabled. The Auth Hook sends the emails; SMTP is not used.

Recommended settings:

- OTP expiry: 600 seconds (10 minutes)
- Minimum interval between requests to the same user: 60 seconds
- Allow email signups: enabled, because public Client registration uses it

## 6. Deploy FINDAT

Deploy the contents of the updated ZIP to Netlify and hard-refresh with `Ctrl + Shift + R`.

The login window now has:

- Password
- Email code
- Continue with Google

The same hook also sends numeric codes for Client signup confirmation and password recovery.

## 7. Test

1. Open FINDAT and choose **Email code**.
2. Enter an email already registered in Supabase Auth.
3. Click **Send code**.
4. Enter the received six-digit code.
5. Click **Verify & log in**.

Unknown emails are not automatically registered because the frontend uses `shouldCreateUser: false`.

## Troubleshooting

- **No email arrives:** check Edge Function logs, the Resend API key, and Resend recipient/domain restrictions.
- **401 from the hook:** the `SEND_EMAIL_HOOK_SECRET` does not match the secret generated in Auth Hooks.
- **429 error:** wait for the configured resend interval or review Authentication → Rate Limits.
- **Code invalid/expired:** request a new code and use only the latest message.
- **Password recovery still sends a link:** the Send Email Hook is not enabled or the old deployment is cached.
