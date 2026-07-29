# Supabase-only deployment checklist

1. In Supabase SQL Editor, run `cloud/FINDAT-STORAGE-ONLY-SETUP.sql`.
2. Verify `Storage → findat-documents` exists and is public.
3. Deploy the full project to Netlify or the current FINDAT host.
4. Hard-refresh the desktop browser with `Ctrl + Shift + R`.
5. Drop a small `.xlsx`, `.pdf`, or `.docx` file.
6. Confirm the upload window says it is uploading directly to Supabase.
7. Confirm a green ✓ appears on the desktop document icon only after success.
8. Drop several documents and confirm they fill one row from left to right, then continue on the next row without covering another icon.
9. Drag one document to a custom position, refresh the browser, and confirm it stays exactly where it was placed.
10. Confirm the object appears under `findat-v1/files` in Storage.
11. In browser DevTools, inspect IndexedDB: file records should contain metadata
   but no document `blob` payload.
12. Refresh another device and confirm the document appears from Supabase.
13. Permanently delete the document and confirm its Storage object disappears.

The older `findat_documents` table may remain, but this build never reads from
or writes to it.
