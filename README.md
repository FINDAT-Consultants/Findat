# FINDAT — Supabase PostgreSQL + private S3 Storage

This build keeps FINDAT document metadata in Supabase PostgreSQL and stores the actual document bytes in the private `findat-documents` bucket through Supabase Storage’s S3-compatible protocol.

```text
Browser drop
   ↓
Immediate local icon and upload badge
   ↓
findat-s3 Edge Function creates a 15-minute S3 upload URL
   ↓
Browser uploads directly to private Supabase Storage
   ↓
PostgreSQL row saved in public.findat_documents
   ↓
Other devices load the SQL catalogue and receive signed download URLs
   ↓
REST Storage automatically takes over if S3 signing is unavailable
```

## Included cloud components

- PostgreSQL table: `public.findat_documents`
- Private Storage bucket: `findat-documents`
- Edge Function: `supabase/functions/findat-s3/index.ts`
- Database migrations: `supabase/migrations/`
- Browser configuration: `cloud/cloud-config.js`
- Local/offline cache: IndexedDB

The frontend contains the Supabase Publishable key only. S3 access credentials are not included in browser JavaScript or in this repository. The existing RLS-controlled Storage REST API remains enabled as an automatic fallback.

## Deploy through the Supabase GitHub integration

Use these settings:

```text
Working directory: .
Production branch: main
Deploy to production: On
```

Push the complete project. Supabase will apply both SQL migrations and deploy the `findat-s3` Edge Function declared in `supabase/config.toml`.

## Configure Edge Function secrets

The S3 credentials that were exposed during setup must be revoked and replaced before deployment. Put the fresh replacement values in **Supabase Dashboard → Edge Functions → Secrets**, not in GitHub and not in `cloud-config.js`.

Create these secret names:

```text
FINDAT_S3_ACCESS_KEY_ID
FINDAT_S3_SECRET_ACCESS_KEY
FINDAT_S3_ENDPOINT
FINDAT_S3_REGION
FINDAT_S3_BUCKET
FINDAT_MAX_FILE_BYTES
```

Use the non-secret values already documented in `supabase/functions/.env.example` for endpoint, region, bucket and size limit. Use newly generated values for the two credential secrets.

CLI alternative:

```bash
supabase secrets set --env-file supabase/functions/.env --project-ref gmiqvpemuabjueyprwyl
supabase functions deploy findat-s3 --project-ref gmiqvpemuabjueyprwyl
```

Never commit `supabase/functions/.env`; it is ignored by Git.

## Manual SQL alternative

When not using automatic GitHub deployment, run these files in the Supabase SQL Editor, in order:

```text
cloud/supabase-findat-setup.sql
cloud/supabase-findat-s3-setup.sql
```

The Edge Function still must be deployed from the Dashboard or CLI.

## Verify

1. Run `cloud/supabase-verify.sql` in the SQL Editor.
2. Open FINDAT and run **System Settings → FINDAT Cloud → Sync Now**.
3. Drop a small Excel file.
4. Confirm a row appears in `Table Editor → findat_documents`.
5. Confirm an object appears in `Storage → findat-documents → objects`.
6. Refresh FINDAT on another device.

A completed upload has both the PostgreSQL row and Storage object. A local icon by itself means only the IndexedDB fallback succeeded.
