# x1 | ProATR — Supabase Dashboard Setup

This setup makes x1 available to visitors without requiring a FINDAT login. OpenAI remains server-side in Supabase.

## 1. Apply the database upgrade

In Supabase Dashboard → **SQL Editor**, run all SQL from:

`FINDAT-X1-OPENAI-API-UPGRADE.sql`

This upgrades `findat_ai_usage` in place, preserves existing rows, and adds atomic quotas for signed-in and anonymous requests. Prompt and answer text are not stored in this table.

## 2. Add Edge Function secrets

In **Edge Functions → Secrets**, add:

```text
OPENAI_API_KEY = YOUR_NEW_OPENAI_PROJECT_KEY
OPENAI_MODEL = gpt-5-mini
OPENAI_REASONING_EFFORT = low
OPENAI_MAX_OUTPUT_TOKENS = 1400
X1_OPENAI_HOURLY_LIMIT = 30
X1_OPENAI_DAILY_LIMIT = 150
X1_OPENAI_ANON_HOURLY_LIMIT = 10
X1_OPENAI_ANON_DAILY_LIMIT = 40
X1_ANON_HASH_SALT = A_LONG_RANDOM_SECRET
X1_OPENAI_TIMEOUT_MS = 55000
X1_OPENAI_MAX_REQUEST_BYTES = 180000
```

Never put the OpenAI key or a Supabase secret/service-role key in GitHub, HTML, JavaScript or `findat-auth-config.js`.

## 3. Deploy the Edge Function

Create or update the function named exactly:

`findat-x1-openai`

Paste the complete contents of:

`supabase/functions/findat-x1-openai/index.ts`

The function is self-contained. Disable **Verify JWT** for this function, or deploy through the CLI with:

```bash
supabase functions deploy findat-x1-openai --no-verify-jwt
```

Disabling the gateway JWT check is required for no-login chat. The function itself still validates a user token when one is available and applies anonymous quotas when it is not.

## 4. Upload the replacement frontend files

Replace the supplied files at their existing GitHub paths. Do not delete the rest of the repository. The protected GitHub Pages build requires both `assets/js/secure-loader.js` and `assets/data/逻辑9.fdx` from this update.

## 5. Test

1. Open the deployed site through HTTPS in a private/incognito window.
2. Do not log in.
3. Open x1 | ProATR and ask a financial question.
4. Confirm that OpenAI returns the answer without opening the login screen.
5. Also test while signed in; the browser will attach the user session automatically.

## Troubleshooting

### “Run the updated FINDAT-X1-OPENAI-API-UPGRADE.sql”
The new database columns or quota function are missing. Run the updated SQL file.

### “x1 OpenAI service is not configured”
The OpenAI key or required Supabase server environment is unavailable.

### “The OpenAI project key or permissions must be checked”
Check that the key is active and permitted to create Responses in the selected OpenAI project.

### OpenAI connection error appears in x1
Check **Edge Functions → Logs**. X1 intentionally shows the OpenAI error instead of substituting a local chatbot answer.
