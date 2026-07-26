# Storage-only deployment checklist

1. In Supabase SQL Editor, run `cloud/FINDAT-STORAGE-ONLY-SETUP.sql`.
2. Verify `Storage → findat-documents` exists and is public.
3. Deploy the full project to Netlify.
4. Hard-refresh the desktop browser with `Ctrl + Shift + R`.
5. Open the phone site in a private tab for the first test.
6. Drop a small `.xlsx` file.
7. Confirm it appears under `findat-v1/files` in the Storage dashboard.
8. Refresh the phone; the document should appear after synchronisation.
9. Delete the document permanently and confirm its Storage object disappears.

The older `findat_documents` table may remain in Supabase, but this build never
reads from or writes to it.
