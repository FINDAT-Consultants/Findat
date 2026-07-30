/* FINDAT Cloud — Supabase Storage-only configuration.
 *
 * Only the browser-safe Publishable key belongs in this frontend file.
 * Never add sb_secret_ keys, service-role keys, or S3 secret keys here.
 */
window.FINDAT_CLOUD_CONFIG = Object.freeze({
  enabled: true,
  provider: 'supabase',

  supabaseUrl: 'https://gmiqvpemuabjueyprwyl.supabase.co',
  publishableKey: 'sb_publishable_1bOP6RQg-Wd2k51Q3LB1Pg_LsWjdErW',
  anonKey: '',

  // The actual document bytes and FINDAT folder markers are stored here.
  bucket: 'findat-documents',
  publicBucket: true,
  objectRoot: 'findat-v1',

  // Document bytes are never retained in IndexedDB or localStorage. The browser
  // keeps only lightweight file/folder metadata needed to draw the desktop.
  documentStorage: 'supabase-only',
  cacheFileBytes: false,

  // A cloud operation must finish successfully before the browser transaction
  // is accepted. This prevents failed uploads from appearing as cloud-saved.
  requireRemoteCommit: true,
  maxFileBytes: 50 * 1024 * 1024,
  maxWallpaperBytes: 8 * 1024 * 1024,
  refreshIntervalMs: 15000,

  // Optional GitHub provider settings. They are ignored while provider is
  // 'supabase'.
  apiEndpoint: '/api/findat-github',
  repoOwner: 'YOUR_GITHUB_USERNAME_OR_ORGANISATION',
  repoName: 'YOUR_DOCUMENT_REPOSITORY',
  branch: 'main',
  rootPath: 'findat-cloud',
  publicRepository: true
});
