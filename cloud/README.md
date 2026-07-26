# FINDAT Cloud — GitHub Repository Documents Edition

FINDAT Cloud preserves the existing desktop, workstations, profile, Office apps, local IndexedDB cache, drag-and-drop, paste, folders, previews, Trash, backups, and fullscreen controls.

The shared document layer now supports:

1. **GitHub repository mode** — the requested default. Dropped documents are visibly uploaded and committed to a GitHub repository.
2. **Supabase mode** — retained for compatibility with the previous shared-cloud package.
3. **Local mode** — IndexedDB remains available when shared storage is disabled or temporarily offline.

## GitHub behaviour

- A dropped document appears on the desktop immediately with a spinning upload badge.
- A visible progress window reports the transfer to the secure backend.
- The backend commits the file into `findat-cloud/objects/` in the configured repository.
- The backend updates `findat-cloud/manifest.json` so all website visitors see the same document tree.
- A successful GitHub commit changes the spinning badge to the blue shared-cloud badge.
- Images, PDFs, audio, and video can be embedded in the built-in Preview window.
- **Copy Shared Link** uses a raw GitHub link for public repositories and a backend-proxied link for private repositories.
- Move, rename, edit, restore, Trash, permanent deletion, and Empty Trash are synchronised to the repository.
- Permanent deletion removes the current repository object and manifest entry. Earlier versions may remain in Git history, as expected for Git.
- If GitHub is unavailable, the local browser cache remains usable and unsynchronised documents retain their pending badge.

## Configure GitHub storage

1. Create or choose a dedicated GitHub repository.
2. Create a fine-grained token restricted to that repository with **Contents: Read and write**.
3. Edit `cloud-config.js` and set:

```js
window.FINDAT_CLOUD_CONFIG = Object.freeze({
  enabled: true,
  provider: 'github',
  apiEndpoint: '/api/findat-github',
  repoOwner: 'YOUR_GITHUB_USERNAME_OR_ORGANISATION',
  repoName: 'YOUR_DOCUMENT_REPOSITORY',
  branch: 'main',
  rootPath: 'findat-cloud',
  publicRepository: true,
  maxFileBytes: 25 * 1024 * 1024,
  bootstrapLocalWhenRemoteEmpty: true,
  refreshIntervalMs: 30000
});
```

4. Configure the environment variables described in `../github-backend/.env.example`.
5. From `../github-backend`, run `npm start` and open the displayed address.
6. Use **System Settings → FINDAT Cloud → Publish Local Files** to commit older browser-only files.

Never place `GITHUB_TOKEN` in the browser configuration.

Detailed backend and deployment instructions are in `../github-backend/README.md`.

## Production access control

The included endpoint is a collaborative write service: any visitor who can reach it can attempt document operations. `FINDAT_ALLOWED_ORIGINS` controls browser CORS but is not user authentication. For an unrestricted public website, place the endpoint behind your real sign-in/session system and authorise upload and deletion on the server.

## File-size note

The package defaults to 25 MiB per document. Both the browser `maxFileBytes` and backend `FINDAT_MAX_FILE_BYTES` must match. Regular GitHub repositories reject individual files at 100 MiB, and GitHub recommends smaller repository objects for healthy performance.

## Supabase compatibility

To keep using the previous provider, set `provider: 'supabase'`, fill in the Supabase settings in `cloud-config.js`, and run `supabase-findat-setup.sql`. The GitHub backend is not used in that mode.

## Local preview

GitHub mode requires the backend. Local-only mode can still run from a simple static server, but it cannot commit documents to GitHub.
