# Supabase deployment files

- `migrations/20260727110000_findat_auth_rbac_postgres.sql` creates the FINDAT
  profiles, articles, audit trail, role functions, triggers and Row Level
  Security policies.
- `functions/findat-username-login` performs username-or-email login without
  exposing the profile directory.
- `functions/findat-admin-users` provides authenticated Administrator-only
  account creation, password replacement and suspend/reactivate controls.
- `functions/findat-bootstrap-admin` creates the first Administrator once using
  a temporary server-side bootstrap secret.

See `../AUTH-POSTGRES-RBAC-DEPLOYMENT.md` before deployment.

- `migrations/20260728170000_findat_collaboration_publishing_upgrade.sql` adds
  five-person collaboration requests, accepted-collaborator article access,
  contributor byline layouts, and article-specific Consultant publishing
  assignments.

Run migrations in timestamp order. The collaboration upgrade does not require a
new Edge Function.

- `migrations/20260801150000_findat_x1_openai_api.sql` adds metadata-only
  OpenAI usage auditing plus atomic authenticated and anonymous quota claims.
- `functions/findat-x1-openai` securely proxies public x1 financial synthesis
  to the OpenAI Responses API. FINDAT login is optional. Store
  `OPENAI_API_KEY` only as a Supabase secret and deploy this function with
  `verify_jwt = false`; the function performs its own optional user validation
  and anonymous abuse controls.
