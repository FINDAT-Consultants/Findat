# FINDAT — Supabase SQL Cloud Build

This build uses Supabase as the active shared cloud provider for the FINDAT desktop.

- **PostgreSQL table:** `public.findat_documents`
- **Storage bucket:** `findat-documents`
- **Supabase project:** `https://gmiqvpemuabjueyprwyl.supabase.co`
- **Local fallback/cache:** browser IndexedDB

Dropped documents appear immediately on the desktop. Their bytes upload to Supabase Storage, and their names, paths, folders, sizes, MIME types, Trash state, versions and object locations are saved to the SQL table.


## Security action required

A Supabase Secret key was shared during setup. Rotate or revoke it before deployment. This build does not contain that key and deliberately blocks `sb_secret_...` values in browser configuration. Use only the project's browser-safe `sb_publishable_...` key. See `SECURITY-NOTICE.md`.

## Deploy the SQL database through GitHub

The repository now contains:

```text
supabase/
├── config.toml
└── migrations/
    └── 20260726073000_findat_cloud_sql.sql
```

In the Supabase GitHub integration:

1. Keep **Working directory** as `.`.
2. Keep the production branch as `main`.
3. Enable **Deploy to production**.
4. Commit and push this complete project to `main`.

Supabase will run the timestamped SQL migration from `supabase/migrations`.

## Manual alternative

Open Supabase **SQL Editor** and run:

```text
cloud/supabase-findat-setup.sql
```

Do not apply the same migration both automatically and manually unless you understand the migration history. The SQL itself is idempotent, but the Supabase migration ledger should remain consistent.

## Add the browser-safe key

Open `cloud/cloud-config.js` and replace:

```js
publishableKey: 'PASTE_SUPABASE_PUBLISHABLE_KEY_HERE'
```

with the project’s browser-safe `sb_publishable_...` key.

Never put an `sb_secret_...` key or legacy `service_role` key in frontend code.

## Verify the result

Run `cloud/supabase-verify.sql` in the SQL Editor, then drop a small document onto the FINDAT desktop.

A successful upload produces:

1. a visible desktop icon;
2. an object under `Storage → findat-documents → objects`;
3. a row in `Table Editor → findat_documents`;
4. a blue cloud badge after both Storage and SQL writes succeed.

See `cloud/README.md` for operational details and security notes.
