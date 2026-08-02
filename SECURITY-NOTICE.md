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


## Account authentication in this build

The website login has been migrated from the former browser-only prototype to
Supabase Auth. Do not reuse the former prototype Administrator password: any
credential previously embedded in frontend code must be treated as exposed.
Create a new Administrator credential through the one-time server-side bootstrap
procedure.

`findat-auth-config.js` contains only the browser-safe Supabase project URL and
publishable key. Administrator user creation and password replacement use the
`findat-admin-users` Edge Function, whose service-role credential remains in the
Supabase function environment.

The account/article tables use Postgres Row Level Security. The Cloud desktop's
existing Storage policies remain a separate security boundary and should be
converted from anonymous collaborative access to authenticated owner/workspace
policies before confidential documents are used.

## x1 OpenAI key handling

The OpenAI secret must exist only in Supabase Edge Function secrets under
`OPENAI_API_KEY`. Never place it in browser JavaScript, HTML, public
configuration, GitHub, deployment archives, screenshots, support messages or
logs. Revoke and replace any key that has been exposed.
