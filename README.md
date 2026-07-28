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

Documents dropped on the FINDAT desktop are placed in the next free position in
a horizontal grid. The first document row begins below FINDAT Cloud,
Applications, and Trash; documents then fill from left to right before continuing
on the next row. Existing saved positions are placed first, so adding or
refreshing a document never moves an icon that the user has already positioned.
Icons can be dragged freely, their exact positions are retained across refreshes
and resizes, and collision protection prevents one icon from hiding another.


## Document opening and mobile access

Word, Excel, PowerPoint and PDF documents now open in the FINDAT Preview window
instead of starting an automatic download. The Download button remains a
separate user action. Mobile devices open items with one tap and use a full-size
viewer.

A compact Supabase metadata index is maintained at `findat-v1/index.json` so a
phone can show cloud document icons quickly. FINDAT still performs a full
Storage reconciliation in the background, and document bytes remain remote-only.


## Built-in wallpapers and cross-device custom wallpaper

The desktop includes Monterey Dark, Monterey Light, FINDAT Office Light and
FINDAT Office Dark, while retaining the existing gradient choices. Monterey
Dark is the default for new and migrated installations.

A Custom wallpaper is compressed in memory, uploaded to Supabase Storage, and
then applied from its public cloud URL. The selected wallpaper and fit mode are
stored under `findat-v1/settings/`, so another computer or phone connected to
the same FINDAT deployment receives the same wallpaper automatically. No image
bytes are kept in browser storage by the new custom-wallpaper flow.

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


## Supabase Auth, Postgres and role-based workflow

The website header now provides **Forgot Username or Password**, **Register**,
username, password and Login controls backed by Supabase Auth. Account profiles,
roles, articles and approval records are stored in Supabase Postgres. Public
registration always creates a Client; Consultant accounts are created by an
Administrator. Clients are restricted to writing their own article text, while
assigned Consultants handle editorial changes and media; the Administrator role is protected and unavailable in any
browser role selector.

Apply `FINDAT-AUTH-RBAC-POSTGRES-SETUP.sql`, deploy the included Edge Functions,
and create the first Administrator using `ADMIN-BOOTSTRAP-EXAMPLE.txt`. Complete
instructions are in `AUTH-POSTGRES-RBAC-DEPLOYMENT.md`. No Administrator password,
service-role key or Supabase secret key is present in the frontend.
