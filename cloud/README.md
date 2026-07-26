# FINDAT Cloud — Supabase PostgreSQL with S3 Edge transport

## Architecture

FINDAT uses two distinct Supabase services:

| Component | Purpose |
|---|---|
| `public.findat_documents` PostgreSQL table | Shared file/folder catalogue, paths, names, sizes, MIME types, Trash state and Storage object locations |
| Private `findat-documents` Storage bucket | Actual Excel, PDF, image and other document bytes |
| `findat-s3` Edge Function | Holds S3 credentials server-side and issues short-lived upload/download URLs or performs object deletion |
| Browser IndexedDB | Immediate display, offline cache and pending-upload recovery |
| Storage REST fallback | Automatically completes upload/download/delete when the S3 Edge route is unavailable |

The S3 credentials bypass Storage RLS and therefore must never appear in frontend code. `cloud-config.js` contains only the browser-safe Publishable key and the Edge Function name.

## Upload lifecycle

```text
queued → signing → uploading → PostgreSQL save → ready
```

1. The dropped document is saved locally and appears immediately.
2. FINDAT calls `findat-s3` with the intended object path, MIME type and size.
3. The Edge Function signs a 15-minute S3 `PUT` URL.
4. The browser uploads directly to Supabase Storage.
5. FINDAT upserts the authoritative metadata row into PostgreSQL.
6. The local item receives its cloud-saved state.

If either the Storage upload or SQL write fails, the local document remains available with a pending state for retry.

## Required deployment

### Automatic

The Supabase GitHub integration deploys:

- `supabase/migrations/20260726073000_findat_cloud_sql.sql`
- `supabase/migrations/20260726100000_findat_s3_edge_storage.sql`
- `supabase/functions/findat-s3/index.ts`

Keep the integration working directory as `.` and enable production deployment.

### Edge Function secrets

Set the names shown in `supabase/functions/.env.example` through the Dashboard’s Edge Function Secrets page or the Supabase CLI. Generate a fresh S3 key pair first because the earlier pair was disclosed.

### Manual database installation

Run:

```text
supabase-findat-setup.sql
supabase-findat-s3-setup.sql
```

The second file makes the bucket private. Existing Storage RLS policies remain available so FINDAT can automatically fall back to the standard Supabase Storage API if S3 signing or browser CORS is unavailable.

## Verification

Run `supabase-verify.sql`. The bucket query should show:

```text
id: findat-documents
public: false
file_size_limit: 52428800
```

The FINDAT cloud health check should report both PostgreSQL and `Supabase Storage S3` as available. A test upload is successful only when the object and SQL row both exist.

## Current access model

PostgreSQL metadata is still collaboratively writable through the existing anonymous RLS policies because FINDAT does not yet have Supabase user authentication. The Edge Function also accepts the browser’s Publishable key and restricts operations to the configured bucket and `objects/` prefix.

Before opening the website to an untrusted public audience, add Supabase Auth and require a user JWT in the Edge Function and owner/admin policies on `findat_documents`.
