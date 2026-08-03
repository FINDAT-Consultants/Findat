# FINDAT password-recovery redirect fix

The reset email was falling back to `http://localhost:3000` because the production redirect was not accepted by Supabase Auth. This build sends recovery users back to the deployed page without adding a competing URL fragment; the existing `PASSWORD_RECOVERY` listener opens the new-password form.

## Supabase Dashboard settings

Open **Authentication → URL Configuration** and set:

- **Site URL:** `https://findat.netlify.app`
- **Redirect URLs:**
  - `https://findat.netlify.app`
  - `https://findat.netlify.app/`
  - `https://findat.netlify.app/**`

Remove `http://localhost:3000` from production settings unless it is still needed for local development.

## Deployment

1. Deploy this package to Netlify, replacing the previous files.
2. Hard refresh with `Ctrl + Shift + R`.
3. Request a **new** reset email. Previously generated emails retain their old redirect target.
4. Click the new email link. FINDAT should open and display its password-reset form.

No SQL or Edge Function change is required.
