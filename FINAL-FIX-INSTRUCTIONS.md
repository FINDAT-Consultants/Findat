# FINDAT Supabase final upload/delete fix

This build fixes the `401: new row violates row-level security policy for table "findat_documents"` error.

## Required live Supabase repair

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Run the complete file:
   `cloud/FINDAT-FINAL-RLS-STORAGE-REPAIR.sql`
3. Wait approximately 30 seconds for the Data API schema cache to refresh.
4. Run `cloud/FINDAT-FINAL-VERIFY.sql` and confirm:
   - `findat_cloud_health()` reports `database: ok` and `bucket_exists: true`.
   - Four permissive policies exist on `public.findat_documents`.
   - Four permissive FINDAT policies exist on `storage.objects`.
   - `anon` and `authenticated` have SELECT/INSERT/UPDATE/DELETE privileges on the metadata table.

## Deploy

Deploy this whole directory to Netlify. The cloud scripts include a version query string so browsers fetch the corrected JavaScript instead of an older cached copy.

## Behaviour

- Uploads first transfer the file bytes to Supabase Storage.
- PostgreSQL metadata is then saved to `public.findat_documents`.
- Direct metadata writes retry through validated PostgreSQL RPC functions if an old RLS policy still blocks the Data API during rollout.
- Moves to Trash, restore, rename and permanent deletion are synchronised.
- Failed cloud mutations are rolled back locally. FINDAT no longer presents a failed upload or deletion as successfully saved on one device.
- Pending files created by an earlier deployment are retried during cloud synchronisation.

## Security

The frontend contains only the browser-safe Publishable key. Rotate the previously disclosed Supabase Secret key and S3 key pair. Do not put those credentials in Netlify frontend variables, GitHub, or browser JavaScript.
