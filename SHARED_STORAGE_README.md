# FINDAT Cloud shared storage

This build contains a durable shared-workspace server. When every user opens the same deployed server address, FINDAT Cloud synchronises its virtual files, folders, Office documents, workstations, desktop layout, personalisation, notes and profile data across their browsers.

## Important

Opening `index.html` directly, GitHub Pages, or an ordinary static file host still uses browser-only storage. Cross-device saving requires the bundled `server.js` to run on an always-on computer or hosted server with a persistent data disk.

## Start on one computer or a local network

1. Install Node.js 20 or newer.
2. Extract the ZIP.
3. In the extracted folder, run:

   ```bash
   npm start
   ```

   Windows users may double-click `start-findat-cloud.bat`.
4. Open `http://localhost:8080`.
5. Other devices on the same network can open `http://SERVER-IP:8080`.

Data is stored in `.findat-data` unless `FINDAT_DATA_DIR` is set.

## Keep it available after your device is switched off

Deploy the whole extracted folder to an always-on Node.js host, virtual private server, or Docker host. Attach a persistent disk and set:

- `FINDAT_DATA_DIR=/data`
- `PORT=8080` or the port supplied by the host
- `FINDAT_ACCESS_KEY=a-strong-shared-key` to restrict access

All authorised users must open the same deployed URL. When an access key is enabled, the browser asks each user for it and keeps it only for that browser session.

## Docker

```bash
docker build -t findat-cloud .
docker run -d --name findat-cloud \
  -p 8080:8080 \
  -e FINDAT_ACCESS_KEY="replace-with-a-strong-key" \
  -v findat-data:/data \
  findat-cloud
```

## Synchronisation behaviour

- The server is the shared source of truth.
- The browser keeps a local IndexedDB mirror for speed.
- Changes are checked approximately every three seconds.
- A change from another device refreshes the Cloud desktop automatically.
- If the server is temporarily unreachable, file and settings changes are queued locally and sent when that device reconnects.
- Concurrent edits use last-write-wins behaviour; this is shared workspace storage, not simultaneous co-authoring inside the same document.

## Backup

Back up the directory specified by `FINDAT_DATA_DIR`. It contains workspace metadata and file blobs. Stop the server or take a filesystem snapshot before copying it for a fully consistent backup.
