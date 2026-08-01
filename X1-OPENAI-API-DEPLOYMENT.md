# FINDAT x1 | ProATR — OpenAI through Supabase

The website is already wired to the authenticated Supabase Edge Function named `findat-x1-openai`.

For the easiest setup, follow `SUPABASE-DASHBOARD-SETUP.md`.

## CLI deployment

### 1. Revoke the exposed key

Delete the OpenAI key previously shared in chat and create a new OpenAI project key. Never commit a real key to GitHub.

### 2. Link the repository to Supabase

```bash
supabase login
supabase link --project-ref gmiqvpemuabjueyprwyl
```

### 3. Apply the database migration

Either run `FINDAT-X1-OPENAI-API-UPGRADE.sql` in the Dashboard SQL Editor, or run:

```bash
supabase db push
```

### 4. Store secrets

```bash
supabase secrets set OPENAI_API_KEY="YOUR_NEW_OPENAI_PROJECT_KEY"
supabase secrets set OPENAI_MODEL="gpt-5-mini"
supabase secrets set OPENAI_REASONING_EFFORT="low"
supabase secrets set OPENAI_MAX_OUTPUT_TOKENS="1400"
supabase secrets set X1_OPENAI_HOURLY_LIMIT="30"
supabase secrets set X1_OPENAI_DAILY_LIMIT="150"
supabase secrets set X1_OPENAI_TIMEOUT_MS="55000"
```

Hosted Supabase Edge Functions receive `SUPABASE_URL` and Supabase project keys automatically. Do not place secret/service-role keys in the browser configuration.

### 5. Deploy

```bash
supabase functions deploy findat-x1-openai
```

Keep JWT verification enabled. `supabase/config.toml` already has:

```toml
[functions.findat-x1-openai]
verify_jwt = true
```

### 6. Verify the SQL objects

Run `FINDAT-X1-OPENAI-API-VERIFY.sql` in the SQL Editor.

### 7. Test in the website

Sign in to FINDAT, open x1 | ProATR, and submit a financial question. The browser sends the signed-in user's access token to Supabase. Supabase validates the user, checks the active FINDAT profile, enforces usage limits, calls the OpenAI Responses API, and returns only the generated answer and usage metadata.

## Files used

- `supabase/functions/findat-x1-openai/index.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/config.toml`
- `FINDAT-X1-OPENAI-API-UPGRADE.sql`
- `FINDAT-X1-OPENAI-API-VERIFY.sql`
- `findat-auth-config.js`

No separate Node.js backend is required.
