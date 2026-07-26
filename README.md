# FINDAT — Supabase PostgreSQL + Storage REST

This build fixes the upload and deletion failure shown by:

```text
Could not find the function public.findat_cloud_health without parameters
in the schema cache
```

The optional health RPC no longer blocks uploads. FINDAT now verifies the
PostgreSQL table directly and writes document bytes through the standard
Supabase Storage REST API.

## Cloud architecture

```text
Dropped document
  → appears immediately in FINDAT
  → uploads to Supabase Storage bucket findat-documents
  → metadata is upserted into PostgreSQL public.findat_documents
  → other devices load the same PostgreSQL catalogue and Storage objects
```

IndexedDB remains only as a cache and failed-upload safety buffer. A document
is cloud-saved only after both the Storage object and PostgreSQL row succeed.

## Required one-time repair

1. Open **Supabase Dashboard → SQL Editor**.
2. Run `cloud/FINDAT-LIVE-STORAGE-REPAIR.sql`.
3. Confirm `public.findat_documents` exists in Table Editor.
4. Confirm `findat-documents` exists in Storage.
5. Deploy this full project to Netlify.
6. Hard-refresh the website and run **FINDAT Cloud → Sync Now**.

The repair script creates or repairs the PostgreSQL table, Storage bucket, RLS
policies, optional health function and PostgREST schema-cache notification.

## Security

The website uses only the configured `sb_publishable_...` key. Never place a
Supabase Secret key or S3 access key in browser JavaScript or GitHub. Rotate the
Secret and S3 credentials previously disclosed during troubleshooting.

## Verify

Run `cloud/FINDAT-LIVE-STORAGE-VERIFY.sql` after uploading a test file. A valid
cloud save produces both:

- a row in `public.findat_documents`; and
- an object in `storage.objects` for bucket `findat-documents`.
