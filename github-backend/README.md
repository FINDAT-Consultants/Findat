# FINDAT GitHub Repository Backend

This small Node.js service securely commits FINDAT Cloud documents to a GitHub repository. It also serves the `cloud/` website, so the default browser endpoint `/api/findat-github` works without cross-origin configuration.

## Why a backend is required

A GitHub write token must never be included in `cloud-config.js`, `index.html`, or any browser JavaScript. Website visitors can inspect those files. The backend keeps the token in an environment variable and exposes only the restricted FINDAT document operations.

## 1. Prepare the repository

Create or select the repository that will hold uploaded documents. A dedicated repository is recommended because every upload, edit, rename, move, restore, and permanent deletion creates Git history.

Create a fine-grained GitHub personal access token restricted to this repository with:

- **Repository access:** only the selected document repository
- **Repository permissions → Contents:** Read and write

Do not commit the token to the project.

## 2. Configure the browser

Edit `../cloud/cloud-config.js`:

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

Use `publicRepository: false` for a private repository. In that mode, previews and downloads are proxied through the backend.

## 3. Configure and run the backend

Copy `.env.example` values into your hosting provider's environment settings, or export them in the shell:

```bash
export GITHUB_TOKEN='github_pat_REPLACE_ME'
export GITHUB_OWNER='YOUR_GITHUB_USERNAME_OR_ORGANISATION'
export GITHUB_REPO='YOUR_DOCUMENT_REPOSITORY'
export GITHUB_BRANCH='main'
export GITHUB_ROOT='findat-cloud'
export FINDAT_ALLOWED_ORIGINS='http://localhost:3000'
export FINDAT_MAX_FILE_BYTES='26214400'
npm start
```

Open `http://localhost:3000`.

No npm packages are required. Node.js 18 or newer provides the required `fetch` implementation.

## Repository layout

FINDAT creates this structure in the configured branch:

```text
findat-cloud/
├── manifest.json
└── objects/
    ├── <encoded virtual path>.pdf
    ├── <encoded virtual path>.docx
    └── ...
```

`manifest.json` preserves the desktop/folder paths, names, MIME types, sizes, modified times, Trash locations, and corresponding repository object paths.

## Visible upload behaviour

When a document is dropped onto the desktop:

1. Its desktop icon appears immediately.
2. A spinning badge marks it as uploading.
3. The transfer window reports browser-to-backend progress.
4. The backend commits the file under `findat-cloud/objects/`.
5. The backend updates `findat-cloud/manifest.json`.
6. The spinning badge becomes a blue cloud badge after both commits succeed.

If the GitHub commit fails, the local cached document remains visible with its pending badge. The error is shown, and **System Settings → FINDAT Cloud → Publish Local Files** can retry it.

## Deployment notes

GitHub Pages is static hosting and cannot run this Node backend. Host the backend on a Node-capable service or your own server. When the frontend is hosted separately, set:

- `cloud-config.js → apiEndpoint` to the backend's full HTTPS URL;
- `FINDAT_ALLOWED_ORIGINS` to the website's exact origin.

Keep the backend behind HTTPS in production.

## Production access control

The included endpoint is a collaborative write service: any visitor who can reach it can attempt document operations. `FINDAT_ALLOWED_ORIGINS` controls browser CORS but is not user authentication. For an unrestricted public website, place the endpoint behind your real sign-in/session system and authorise upload and deletion on the server.

## GitHub storage limits

This package defaults to 25 MiB per uploaded file. You may raise `maxFileBytes` and `FINDAT_MAX_FILE_BYTES`, but regular GitHub repositories enforce a 100 MiB single-file limit and are optimised for source control rather than high-volume file storage. Keep both values identical.

For many large documents, Git LFS or object storage is more suitable; the included browser flow intentionally uses ordinary repository files so the documents remain directly visible in the GitHub repository.
