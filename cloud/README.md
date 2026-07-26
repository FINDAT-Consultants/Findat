# FINDAT Cloud — direct Supabase Storage

`shared-cloud.js` is a Storage-only provider. It performs no requests to
`/rest/v1/findat_documents` and no custom SQL document table is required.

## Object layout

```text
findat-documents/
└── findat-v1/
    ├── files/    # actual document bytes; virtual paths are encoded in keys
    └── folders/  # zero-byte markers for empty folders
```

The same object listing is used to rebuild the FINDAT desktop on another
computer or phone.

## Operations

- Upload/write: Storage object upload with `x-upsert: true`.
- List/synchronise: Storage object-list API.
- Preview/download: public Storage URL, or authenticated object download when
  the bucket is private.
- Rename/move/Trash/restore: write the object at the new encoded path, then
  remove the old object.
- Permanent delete/Empty Trash: Storage object-delete API.

The application accepts a browser mutation only after the Supabase Storage
operation succeeds. If Storage rejects the operation, the local browser change
is rolled back so it is not presented as cloud-saved.

## Setup

Run `FINDAT-STORAGE-ONLY-SETUP.sql` in Supabase SQL Editor. It creates the
bucket and Storage policies only. `FINDAT-STORAGE-ONLY-VERIFY.sql` checks the
configuration and recent objects.
