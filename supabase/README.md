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
