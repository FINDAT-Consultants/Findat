# Assurance Regent — Supabase-only persistence

Assurance Regent is configured so mutable application data is persisted through the Node server to Supabase. The server refuses to start without `SUPABASE_URL` plus `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`). The service credential stays server-side.

## SQL

1. Run `ASSURANCE-REGENT-SUPABASE-SETUP.sql` in the Supabase SQL Editor.
2. Only on a brand-new installation, optionally run `ASSURANCE-REGENT-SUPABASE-INITIAL-SEED.sql` to load the prototype workbook reference dataset. That seed truncates the workbook foundation tables, so do not run it over live Assurance Regent data.
3. Run `ASSURANCE-REGENT-SUPABASE-VERIFY.sql` to verify tables, RLS and grants.

## Server secrets

Set these only in the deployed Assurance Regent server environment:

- `SUPABASE_URL` — same FINDAT Supabase project URL.
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` — server-only credential.
- `OPENAI_API_KEY` — the same secret value used by x1 | ProATR.
- `ADRA_REQUIRE_SUPABASE=true`.
- `ADRA_LOCAL_STATE_MIRROR=false`.

Do not put the Supabase secret/service-role key or OpenAI key in browser JavaScript.

## Browser persistence

The served Assurance Regent application does not use `localStorage`, `sessionStorage`, or `IndexedDB` for application records. API responses are also served with no-store/no-cache headers by the Node server. Mutable records are written through the server to Supabase.
