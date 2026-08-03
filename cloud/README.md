# FINDAT Cloud — remote-only Supabase Storage

`shared-cloud.js` uses Supabase Storage directly. It makes no requests to a
custom FINDAT SQL document table.

## Remote-only file flow

- The selected file is held in JavaScript memory while it uploads.
- The browser posts the bytes directly to Supabase Storage.
- A failed remote upload is rolled back and does not appear as saved.
- A successful upload stores only icon/path metadata in IndexedDB.
- The desktop document receives a green ✓ after Supabase confirms the upload.
- Opening a document downloads it into memory and does not cache it locally.

## Object layout

```text
findat-documents/
└── findat-v1/
    ├── files/      # actual document bytes; virtual paths are encoded in keys
    ├── folders/    # zero-byte markers for empty folders
    └── index.json  # compact metadata index for fast phone/tablet discovery
```

The compact index draws the FINDAT desktop quickly on another computer or phone. A full Storage object listing then reconciles it in the background.

## Operations

- Upload/write: direct Storage object upload with `x-upsert: true`.
- List/synchronise: compact Storage metadata index first, then the Storage object-list API for authoritative reconciliation; metadata only is cached locally.
- Preview: Office formats use the browser Office viewer; PDF uses a typed in-memory Blob URL; images, media and text open in the FINDAT viewer.
- Download: starts only when the user presses the separate Download control.
- Rename/move/Trash/restore: write at the new encoded path, then delete the old
  Storage object.
- Permanent delete/Empty Trash: Storage object-delete API.

## Setup

Run `FINDAT-STORAGE-ONLY-SETUP.sql` in Supabase SQL Editor. It creates the
bucket and Storage policies only. `FINDAT-STORAGE-ONLY-VERIFY.sql` checks the
configuration and recent objects.
