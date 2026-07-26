# FINDAT Cloud — live Supabase storage

## Active services

| Service | Purpose |
|---|---|
| Supabase PostgreSQL `public.findat_documents` | Shared document/folder metadata, paths, MIME types, Storage paths and Trash state |
| Supabase Storage bucket `findat-documents` | Actual Excel, PDF, image and other file bytes |
| Browser IndexedDB | Cache and pending-upload recovery only |

The active transport is the standard Supabase Storage REST API. No S3 access
keys or Edge Function are required.

## Install or repair the live database

Run `FINDAT-LIVE-STORAGE-REPAIR.sql` in the Supabase SQL Editor. The script is
idempotent and can repair an incomplete installation. It also creates the
optional `public.findat_cloud_health()` function and requests a PostgREST schema
cache reload.

## Upload lifecycle

```text
local pending → Storage upload → PostgreSQL metadata upsert → cloud saved
```

The client no longer treats a missing health RPC as an upload failure. The
actual PostgreSQL and Storage requests are the authority.

## Verification

Run `FINDAT-LIVE-STORAGE-VERIFY.sql`, then verify the same uploaded document is
visible from another browser or phone after refreshing or selecting Sync Now.

## Access model

The supplied SQL currently allows anonymous collaborative read/write/delete so
the existing public FINDAT website works without a sign-in screen. Add Supabase
Auth and owner/admin RLS policies before exposing sensitive documents to an
untrusted public audience.
