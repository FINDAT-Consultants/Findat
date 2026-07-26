/*
 * FINDAT Cloud shared-storage configuration.
 *
 * Supabase is the active provider for this build. The project URL is already
 * configured from the supplied dashboard screenshot. Paste only the browser-
 * safe Supabase Publishable key below. Never place a Secret key or legacy
 * service_role key in this file.
 *
 * GitHub mode remains available as an optional fallback through the included
 * secure backend, but it is not selected in this build. Supabase S3 access
 * credentials are held only in Edge Function secrets and never in this file.
 */
window.FINDAT_CLOUD_CONFIG = Object.freeze({
  enabled: true,
  provider: 'supabase',

  // FINDAT-Consultants's Project
  supabaseUrl: 'https://gmiqvpemuabjueyprwyl.supabase.co',

  // Dashboard: Settings -> API Keys -> copy the Publishable key
  // (sb_publishable_...). The client rejects sb_secret_ keys.
  // The legacy anon JWT is also supported through anonKey below.
  publishableKey: 'sb_publishable_1bOP6RQg-Wd2k51Q3LB1Pg_LsWjdErW',
  anonKey: '',

  bucket: 'findat-documents',
  table: 'findat_documents',
  publicBucket: false,
  storageTransport: 's3-edge',
  edgeFunctionName: 'findat-s3',
  s3Endpoint: 'https://gmiqvpemuabjueyprwyl.storage.supabase.co/storage/v1/s3',
  s3Region: 'eu-west-1',
  s3FallbackToRest: true,
  maxFileBytes: 50 * 1024 * 1024,
  bootstrapLocalWhenRemoteEmpty: true,
  refreshIntervalMs: 30000,

  // Optional GitHub fallback. Leave provider as 'supabase' to ignore these.
  apiEndpoint: '/api/findat-github',
  repoOwner: 'YOUR_GITHUB_USERNAME_OR_ORGANISATION',
  repoName: 'YOUR_DOCUMENT_REPOSITORY',
  branch: 'main',
  rootPath: 'findat-cloud',
  publicRepository: true
});
