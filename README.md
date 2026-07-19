# FINDAT Protected GitHub Package

This is the **public GitHub Pages build**. Upload these files to the repository root.

## Protection applied

- The readable application HTML, CSS and JavaScript files are not included.
- Application payloads are encrypted with AES-256-GCM and stored as `.fdx` files.
- The runtime loader uses mixed Chinese, Russian, Arabic and numeric identifiers.
- Common browser source-view and developer-tool keyboard shortcuts, saving shortcuts and right-click are blocked as a deterrent.
- No source maps are included.

## Important technical limitation

No website delivered to a browser can make its code completely invisible. The browser must receive a decryption key and reconstruct the page to display it. This package prevents casual copying through View Source and makes the public files difficult to understand, but a determined specialist can still inspect the rendered DOM, browser memory or runtime execution.

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
