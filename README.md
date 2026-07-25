# FINDAT Protected Package with Shared Cloud Storage

This package preserves the protected FINDAT application and includes the integrated FINDAT Cloud workstation.

## Shared cross-device storage

Run the bundled Node.js server to make the Cloud workspace persistent and visible across authorised devices. The server synchronises:

- files and folders in the FINDAT virtual drive;
- Word, Excel and PowerPoint workspace data;
- workstations, notes, desktop layout and personalisation;
- FINDAT Cloud profile information.

The browser keeps a local mirror and queues changes during temporary connection loss. Other connected devices check for changes about every three seconds and refresh the Cloud workspace automatically.

See **`SHARED_STORAGE_README.md`** for setup, access-key protection, Docker deployment and backup instructions.

## Start the shared build

Node.js 20 or newer is required.

```bash
npm start
```

Then open `http://localhost:8080`. Windows users may double-click `start-findat-cloud.bat`.

To keep data available after a personal computer is switched off, run this package on an always-on server or hosted Node/Docker service with a persistent disk.

## Static fallback

The protected site can still be uploaded to a static host. In static mode the interface continues to work, but storage remains limited to each browser and is **not** shared across devices.

## Protection applied

- The readable main FINDAT HTML, CSS and JavaScript payloads are not included in the public build.
- Application payloads are encrypted with AES-256-GCM and stored as `.fdx` files.
- No source maps are included.
- Common source-view, saving, printing, context-menu and media-copy actions are deterred.

## Important technical limitation

No browser-delivered website can make its client code or displayed media completely inaccessible. The protection discourages casual copying but cannot prevent determined runtime inspection or screen recording.
