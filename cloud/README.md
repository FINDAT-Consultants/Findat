# FINDAT Cloud — Supabase PostgreSQL + Storage

FINDAT now treats Supabase as the authoritative shared cloud:

```text
Browser drop
   ↓
Visible local icon + pending badge
   ↓
Supabase Storage: document bytes
   ↓
PostgreSQL: findat_documents metadata row
   ↓
Cloud badge + shared visibility
```

## SQL database

The migration creates and maintains `public.findat_documents` with these principal fields:

| Field | Purpose |
|---|---|
| `path` | Unique virtual desktop path and primary key |
| `parent` | Parent folder path |
| `name` | Displayed file or folder name |
| `type` | `file` or `folder` |
| `size` | Original file size in bytes |
| `mime` | MIME type |
| `object_path` | Matching Supabase Storage object |
| `original_path` | Restore destination for Trash items |
| `modified` | FINDAT modification timestamp |
| `created_at`, `updated_at` | SQL-managed timestamps |
| `deleted_at` | Set while an item is in Trash |
| `upload_status` | SQL cloud status |
| `version` | Incremented SQL record version |
| `checksum`, `metadata` | Reserved integrity and client metadata |

The SQL health function `public.findat_cloud_health()` reports the PostgreSQL engine/version, record counts, stored byte totals and whether the bucket exists. FINDAT checks this function when it connects.

## Storage

The actual document bytes are stored in the public `findat-documents` bucket under versioned paths:

```text
objects/<encoded-virtual-path>/<encoded-revision>.<extension>
```

Versioned paths prevent an updated upload from destroying the last known object before the SQL metadata write succeeds. After the SQL row is saved, obsolete objects are removed through the Storage API.

## Installation

### Automated GitHub migration

Commit the repository’s `supabase/` folder and use `.` as the Supabase GitHub integration working directory. The production migration is:

```text
supabase/migrations/20260726073000_findat_cloud_sql.sql
```

### Manual SQL Editor migration

Alternatively, run:

```text
cloud/supabase-findat-setup.sql
```

Then paste the browser-safe Publishable key into `cloud/cloud-config.js`.

## Verification

Run `supabase-verify.sql` in the SQL Editor. In FINDAT:

1. Open the cloud desktop.
2. Drop a PDF, image or text document.
3. Confirm the icon appears immediately with a spinner.
4. Confirm it changes to the cloud badge.
5. Open another browser or device and select **System Settings → FINDAT Cloud → Sync Now**.
6. Move the item to Trash, restore it, then permanently delete a test item and confirm the SQL row and Storage object are removed.

## Failure behaviour

If Supabase is temporarily unavailable, the document remains in IndexedDB with a pending badge. Use **System Settings → FINDAT Cloud → Retry Pending Uploads** after connectivity or configuration is restored.

## Security

The included policies provide public reading and collaborative anonymous writing because the current FINDAT profile system is browser-local. This is functional for a trusted team or controlled site, but an unrestricted public visitor could upload, change or delete shared records.

For public production deployment, add Supabase Auth and replace the anonymous write/delete policies with authenticated owner or administrator policies. The frontend must contain only a Publishable key; never expose a Secret or `service_role` key.
