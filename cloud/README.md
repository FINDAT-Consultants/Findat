# FINDAT Cloud — Shared Documents Edition

FINDAT Cloud keeps the existing desktop, workstations, profile, Office apps, local file cache, drag-and-drop, paste, folders, Trash, fullscreen controls, and backup features.

The document system now supports two storage modes:

1. **Local mode** — the existing IndexedDB workspace remains available in the current browser.
2. **Shared mode** — files and folder metadata are synchronised to Supabase so visitors using the same deployed website can see the same documents.

## Shared cloud behaviour

- Files dropped, pasted, imported, created, edited, copied, moved, or renamed are saved locally and synchronised to the shared cloud.
- Remote documents are downloaded into the browser cache when a visitor opens the website.
- The website checks for shared changes every 30 seconds and whenever the tab becomes active again.
- Images, PDFs, audio, and video can be embedded directly in the built-in Preview window.
- Published files show a blue cloud badge.
- Use **Copy Shared Link** in Preview or the file context menu to copy the public object URL.
- Moving an item to Trash keeps it recoverable and synchronises its Trash location.
- **Delete Permanently** and **Empty Trash** remove both the database metadata and the actual object from cloud storage.
- If shared storage is not configured or is temporarily unavailable, the existing local browser drive remains usable.

## Configure Supabase

1. Create a Supabase project.
2. Open its SQL Editor and run `supabase-findat-setup.sql`.
3. In Supabase, open **Project Settings → API** and copy:
   - the project URL;
   - the browser-safe anon/publishable key.
4. Edit `cloud-config.js`:

```js
window.FINDAT_CLOUD_CONFIG = Object.freeze({
  enabled: true,
  provider: 'supabase',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
  bucket: 'findat-documents',
  table: 'findat_documents',
  publicBucket: true,
  bootstrapLocalWhenRemoteEmpty: true,
  refreshIntervalMs: 30000
});
```

5. Deploy the complete `cloud` folder to the website. Every visitor to that deployment will use the same configured document store.
6. Open **System Settings → FINDAT Cloud** and select **Sync Now**. Use **Publish Local Files** once to publish browser-only files created before shared mode was enabled.

Never place a Supabase service-role key in `cloud-config.js` or any browser file.

## Access-control warning

The supplied SQL enables collaborative anonymous upload, update, and deletion so the feature works with the current browser-only account system. Use it only for a trusted group or controlled site.

For a public production website, integrate Supabase Auth and replace the collaborative write/delete policies with authenticated-user or owner-based policies. The current local ADMIN password protects only that browser session; it is not a secure server identity.

## Local preview

Local-only mode can still be opened directly from `index.html`. For shared mode, serve the folder over HTTP:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/cloud/` when serving from the project root, or `http://localhost:8000/` when serving from inside the `cloud` folder.

## Fullscreen

A desktop/monitor button appears immediately after the **+** workstation button.

- Click the monitor button to enter fullscreen.
- Click it again, or use the browser's normal fullscreen exit control, to leave fullscreen.
- Leaving fullscreen does not pause, reload, or cover the desktop.

## Paste from your computer

- Copy files, folders, images, or text on the local computer, click a FINDAT Cloud desktop or open folder, and press **Ctrl+V**.
- Files and images are imported into the active folder. Folder structure is preserved when the browser supplies directory entries.
- Text copied outside FINDAT Cloud becomes a timestamped text file when pasted onto the desktop or into a folder.
- Pasting inside an input, document editor, spreadsheet cell, or other editable field remains normal text editing and is not intercepted.
- Internal FINDAT Cloud copy/cut and paste continues to work.
