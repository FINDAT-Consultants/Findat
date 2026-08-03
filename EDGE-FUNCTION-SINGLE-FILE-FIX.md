# findat-x1-openai single-file deployment

The function is self-contained in:

`supabase/functions/findat-x1-openai/index.ts`

Paste that complete file into the Supabase Dashboard editor. Do not add a `_shared` import or a separate `cors.ts` file.

Use the exact function name `findat-x1-openai` and disable the Supabase JWT gateway check so visitors can chat without logging in. The function still performs optional user-token validation, request controls, anonymous fingerprinting and database quotas itself.

Required secrets:

- `OPENAI_API_KEY` = a new, unexposed OpenAI project key
- `OPENAI_MODEL` = `gpt-5-mini` or another model enabled for your OpenAI project

Recommended anonymous controls:

- `X1_OPENAI_ANON_HOURLY_LIMIT` = `10`
- `X1_OPENAI_ANON_DAILY_LIMIT` = `40`
- `X1_ANON_HASH_SALT` = a long random secret

Deploy with:

```bash
supabase functions deploy findat-x1-openai --no-verify-jwt
```
