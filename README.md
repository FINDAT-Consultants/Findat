# FINDAT Protected GitHub Package

This is the **public GitHub Pages build**. Upload these files to the repository root.

## Protection applied

- The readable application HTML, CSS and JavaScript files are not included.
- Application payloads are encrypted with AES-256-GCM and stored as `.fdx` files.
- The runtime loader uses mixed Chinese, Russian, Arabic and numeric identifiers.
- Common browser source-view and developer-tool keyboard shortcuts, saving shortcuts and right-click are blocked as a deterrent.
- No source maps are included.

## Media deterrents

- Right-click, image dragging, media-file links, common save/print shortcuts and native video download controls are blocked.
- Picture-in-Picture and remote playback are disabled for the course video.
- The video and poster paths are removed from the static HTML and assigned only after the protected application payload runs.
- Media elements are hidden from ordinary browser printing.
- The local course thumbnail is encrypted as an `.fdx` payload and exposed to the page only through a temporary in-memory Blob URL.

## Important technical limitation

No website delivered through public static hosting can make its code or media completely inaccessible. The browser must receive a decryption key and reconstruct the page to display it. This package prevents casual copying through View Source and makes the public files difficult to understand, but a determined specialist can still inspect runtime network traffic, browser cache or memory, and can also screen-record displayed media.

## Deployment

1. Upload all contents of this folder to the GitHub repository root.
2. In **Settings → Pages**, publish from the required branch/root folder.
3. Do not upload `FINDAT_Private_Source_Backup.zip`; keep it privately for future editing.

## Local preview

The protected build uses `fetch` and Web Crypto, so serve it through HTTP rather than double-clicking `index.html`:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## X1 PDF ledger corrections

- Reads each PDF sequentially from page 1 through the final page.
- Detects transaction columns from their table positions.
- Uses `previous balance + debit - credit` for this ledger format.
- Excludes `Period Total`, `Total for Account`, `End of Report` and page footers.
- Repairs fragmented OCR/PDF amounts by checking transaction values against running-balance continuity.

## Validation against the uploaded TOG ledger

The revised X1 parser was tested against the five-page **TOG LEDGER OCTOBER** report:

- Pages processed: **5 of 5**, beginning at page 1.
- Transaction rows retained by page: **22, 37, 33, 34 and 28** (**154 total**).
- Opening balance: **UGX 239,401,078.00**.
- Reconstructed transaction credits: **UGX 230,077,939.56**.
- Closing balance: **UGX 9,323,138.44**.
- Running-balance continuity errors after repair: **0**.
- `Period Total`, `Total for Account`, `End of Report` and page footers are not imported as transaction rows.
