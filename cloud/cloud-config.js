/*
 * FINDAT Cloud shared-storage configuration.
 *
 * GitHub mode stores every published document and the shared manifest in a
 * GitHub repository. The browser talks only to apiEndpoint. Keep GITHUB_TOKEN
 * on the server in github-backend/.env; never place it in this file.
 *
 * Supabase mode is still supported. See cloud/README.md for both options.
 */
window.FINDAT_CLOUD_CONFIG = Object.freeze({
  enabled: false,
  provider: 'github',

  // Secure backend endpoint. Use an absolute URL when the backend is hosted
  // separately from this website.
  apiEndpoint: '/api/findat-github',
  repoOwner: 'YOUR_GITHUB_USERNAME_OR_ORGANISATION',
  repoName: 'YOUR_DOCUMENT_REPOSITORY',
  branch: 'main',
  rootPath: 'findat-cloud',
  publicRepository: true,
  maxFileBytes: 25 * 1024 * 1024,

  bootstrapLocalWhenRemoteEmpty: true,
  refreshIntervalMs: 30000,

  // Supabase settings retained for optional legacy mode.
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
  bucket: 'findat-documents',
  table: 'findat_documents',
  publicBucket: true
});
