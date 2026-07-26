# FINDAT — Supabase-only Document Storage

This build sends every uploaded, dropped, pasted, created, edited, copied, moved,
or restored document directly to the Supabase Storage bucket
`findat-documents`.

## Storage behaviour

```text
Drop or choose a document
  → keep the file temporarily in memory
  → upload the bytes directly to Supabase Storage
  → wait for a successful Storage response
  → retain only lightweight icon/path metadata in IndexedDB
  → display a green ✓ on the desktop document icon
```

Document bytes are **not** retained in `localStorage`, IndexedDB, or a browser
file cache. Opening or exporting a document downloads it from Supabase into
memory for that operation only.

FINDAT encodes each virtual path under:

```text
findat-v1/files/
findat-v1/folders/
```

Folders use zero-byte marker objects because object-storage folders are key
prefixes rather than physical directories.

## Desktop icon arrangement

Documents dropped on the FINDAT desktop are automatically placed in the next
free grid cell. Icons fill a compact vertical column and then continue into the
next column, while FINDAT Cloud, Applications, and Trash remain in their own
left-hand positions. Existing overlapping positions are corrected automatically,
and manually moved icons snap to the nearest unoccupied cell.

## Required Supabase setup

In the Supabase SQL Editor, run:

```text
cloud/FINDAT-STORAGE-ONLY-SETUP.sql
```

This creates the `findat-documents` bucket and the Storage policies required by
the browser application. No custom FINDAT PostgreSQL document table is used.

## Deployment test

1. Run the Storage setup SQL.
2. Deploy the complete project.
3. Hard-refresh with `Ctrl + Shift + R`.
4. Drop a small document on the FINDAT desktop.
5. Wait for the desktop icon to receive a green ✓.
6. Confirm the object appears in `Storage → findat-documents → findat-v1 → files`.
7. Refresh another device and confirm the document icon is rebuilt from Supabase.

## Security

Only a browser-safe Supabase Publishable key belongs in
`cloud/cloud-config.js`. Never put a Secret key, service-role key, or S3 secret
in frontend code. The included collaborative policies allow anonymous website
visitors to list, upload, replace, and delete FINDAT objects; add Supabase Auth
and owner-based policies before storing private documents.
