# FINDAT document preview and mobile access changes

This build keeps the existing Supabase-only storage, green saved tick, and
manual desktop icon positions. It changes only document opening and cloud
metadata discovery.

## Open before downloading

- Word, Excel, and PowerPoint formats open inside the FINDAT Preview window
  through Microsoft Office's browser viewer when a public Supabase object URL is
  available.
- PDF files are fetched into memory and shown through a typed Blob URL. This
  prevents mobile browsers from treating the normal Supabase URL as an automatic
  download.
- Images, audio, video, text, source files, JSON, HTML, and other browser-readable
  formats continue to open in the FINDAT viewer.
- Unknown formats open a file-information screen. They are not downloaded until
  the user explicitly presses **Download**.
- The viewer retains a separate **Download** button so opening and downloading
  are two different actions.

Office preview formats include DOC, DOCX, DOCM, RTF, XLS, XLSX, XLSM, CSV, PPT,
PPTX, PPTM, ODT, ODS, and ODP. Actual rendering depends on the online viewer's
support for the individual file.

## Faster phone and tablet access

- A compact metadata index is maintained at
  `findat-v1/index.json` in the existing `findat-documents` bucket.
- A new phone can normally discover all document icons with one small index
  request instead of listing every Storage object before drawing the desktop.
- Existing cached icon metadata is drawn immediately while Supabase refreshes in
  the background.
- A full Storage reconciliation runs after the fast index load and periodically
  thereafter, so Storage objects remain the source of truth.
- Mobile devices open files and folders with one tap. Mouse users retain the
  normal single-click-to-select and double-click-to-open desktop behaviour.
- The document viewer uses the full phone viewport for easier reading.
- Cloud polling is set to 15 seconds so documents added on another device appear
  sooner.

## Supabase setup

No additional SQL is required. The current policy already allows objects under
`findat-v1/%`, which includes the new metadata index.

## Privacy note

Office previews use Microsoft's online Office viewer and therefore give that
viewer the public Supabase URL needed to retrieve the selected Office document.
The file remains stored in Supabase; FINDAT does not save document bytes in
localStorage or IndexedDB.
