# Supabase-only document changes

- Uploads, drag-and-drop files, pasted files, text-document saves, copied files,
  moved files, renamed files, Trash operations, restores, and backup imports all
  commit through Supabase Storage.
- New upload bytes are staged in memory only; they are not written to IndexedDB.
- Cloud synchronisation stores only file/folder metadata in IndexedDB.
- Opening and exporting download bytes from Supabase on demand without caching.
- Existing successfully synced browser blobs are removed during startup.
- A pending spinner is shown during upload.
- A green ✓ is shown on the desktop/file icon only after Supabase confirms the
  Storage upload.
- Upload progress language no longer says “saving locally” or refers to SQL
  metadata.
- Desktop documents now auto-arrange into a compact, collision-free vertical grid; newly dropped items use the next free cell and cannot cover existing files, applications, the drive, or Trash.
