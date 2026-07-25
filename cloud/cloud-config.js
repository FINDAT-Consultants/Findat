/*
 * FINDAT Cloud shared-storage configuration.
 *
 * 1. Create a Supabase project.
 * 2. Run supabase-findat-setup.sql in the Supabase SQL editor.
 * 3. Replace the two placeholders below and set enabled to true.
 *
 * The anon key is intended for browser use. Never place a service-role key here.
 */
window.FINDAT_CLOUD_CONFIG = Object.freeze({
  enabled: false,
  provider: 'supabase',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
  bucket: 'findat-documents',
  table: 'findat_documents',
  publicBucket: true,
  bootstrapLocalWhenRemoteEmpty: true,
  refreshIntervalMs: 30000
});
