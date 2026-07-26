# Security notice — rotate the exposed Supabase Secret key

A Supabase `sb_secret_...` key was shared during configuration. Treat it as compromised and rotate or revoke it in **Supabase Dashboard → Settings → API Keys** before deploying FINDAT.

FINDAT's browser code must use only the project's `sb_publishable_...` key. Secret keys bypass Row Level Security and belong only in secured server-side services. This build deliberately rejects an `sb_secret_...` value in `cloud/cloud-config.js`.

After rotating the key:

1. Copy the project's **Publishable key**.
2. Paste it into `cloud/cloud-config.js` as `publishableKey`.
3. Apply `supabase/migrations/20260726073000_findat_cloud_sql.sql` through the GitHub integration, or run `cloud/supabase-findat-setup.sql` once in SQL Editor.
4. Run `cloud/supabase-verify.sql`.
5. Drop a test document and confirm both the PostgreSQL row and Storage object appear.
