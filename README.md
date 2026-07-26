# FINDAT — Supabase Storage-only Cloud

This build stores documents directly in the Supabase Storage bucket
`findat-documents`. It does **not** use the custom `public.findat_documents`
table or the Supabase Data API.

## Cloud flow

```text
Drop document
  → show upload progress
  → POST the file bytes directly to Supabase Storage
  → confirm the Storage response
  → mark the desktop item as cloud-saved
  → list the same Storage objects on phones and other computers
```

FINDAT encodes each virtual file path into an object name under:

```text
findat-v1/files/
findat-v1/folders/
```

Folders use zero-byte marker objects because object-storage folders are key
prefixes rather than physical directories.

## Required Supabase setup

Run `cloud/FINDAT-STORAGE-ONLY-SETUP.sql` once in the Supabase SQL Editor, or
commit the included migration under `supabase/migrations/`.

The setup creates/updates only:

- the `findat-documents` Storage bucket;
- Storage `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.

It does not create a FINDAT document table.

## Deployment

Deploy the complete project to Netlify, then hard-refresh the site. Test with a
small Excel document and confirm the object appears in:

```text
Supabase Dashboard → Storage → findat-documents → findat-v1 → files
```

Use `cloud/FINDAT-STORAGE-ONLY-VERIFY.sql` to inspect the bucket and policies.

## Security

The frontend contains only the browser-safe Supabase Publishable key. Never add
Supabase Secret keys, service-role keys, or S3 secret credentials to the site or
repository. The supplied collaborative policies let website visitors list,
upload, replace, and delete FINDAT objects. Add Supabase Auth and owner-based
policies before using this as a private multi-user document system.
