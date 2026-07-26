# Security notice — rotate exposed elevated credentials

A Supabase Secret key and an S3 access-key pair were shared during configuration.
Treat both as compromised and revoke/rotate them before deployment.

This Storage-only FINDAT build does not use either credential. Browser code uses
only the project’s `sb_publishable_...` key and Storage RLS policies.

After rotating the elevated credentials:

1. Run `cloud/FINDAT-STORAGE-ONLY-SETUP.sql` in Supabase SQL Editor.
2. Deploy the updated website.
3. Drop a test document.
4. Confirm the object appears in `Storage → findat-documents → findat-v1/files`.
5. Refresh another device and confirm the object is listed there.

The collaborative policies in the setup file allow anonymous website visitors
to upload, list, replace, and delete FINDAT objects. Add Supabase Auth and
owner-based policies before storing private documents.
