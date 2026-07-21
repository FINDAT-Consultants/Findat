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
