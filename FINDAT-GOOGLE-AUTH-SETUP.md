# FINDAT Google Sign-In setup

This build adds **Continue with Google** to the public login strip, the login window and the Client registration window. Email/password and username/password sign-in remain available.

## Account and role behaviour

- A completely new Google user is created as a **Client**.
- A Client, Consultant or Administrator who already exists in FINDAT can use Google when the Google account has the same verified email address.
- Google authentication never assigns Consultant or Administrator privileges. FINDAT roles continue to come from Supabase Postgres and Administrator controls.
- The SQL upgrade imports the Google user's name and profile picture only when the corresponding FINDAT profile fields are empty. It does not overwrite profile details edited inside FINDAT.

## 1. Configure Google Auth Platform

Create or select a Google Cloud project and configure the Google Auth Platform consent screen.

Create an OAuth client with application type **Web application**.

Add this authorised JavaScript origin:

```text
https://findat.netlify.app
```

Add this authorised redirect URI exactly:

```text
https://gmiqvpemuabjueyprwyl.supabase.co/auth/v1/callback
```

Copy the generated Google **Client ID** and **Client secret**.

## 2. Enable Google in Supabase

Open:

```text
Supabase → Authentication → Sign In / Providers → Google
```

Enable the provider, paste the Google Client ID and Client secret, and save.

Do not put the Google Client secret, Supabase service-role key or any other secret inside `findat-auth-config.js` or another browser file.

## 3. Confirm Supabase redirect configuration

Open:

```text
Supabase → Authentication → URL Configuration
```

Use:

```text
Site URL: https://findat.netlify.app
```

Add these Redirect URLs:

```text
https://findat.netlify.app
https://findat.netlify.app/
https://findat.netlify.app/**
```

## 4. Run the FINDAT profile upgrade

Open Supabase SQL Editor and run:

```text
FINDAT-GOOGLE-AUTH-PROFILE-UPGRADE.sql
```

This preserves existing roles and supports Google names and profile photographs.

## 5. Deploy the website

Extract the complete ZIP and replace the previous Netlify deployment. Then hard-refresh the browser with `Ctrl + Shift + R`.

## Test

1. Open the FINDAT login window.
2. Click **Continue with Google**.
3. Select a Google account.
4. Approve the Google consent request if displayed.
5. Confirm FINDAT returns to the Writing Desk.
6. Check `Authentication → Users` and `Database → findat_profiles` in Supabase.

For an existing Consultant or Administrator, use the exact Google email already stored on that FINDAT account so Supabase can link the verified identity to the existing user.
