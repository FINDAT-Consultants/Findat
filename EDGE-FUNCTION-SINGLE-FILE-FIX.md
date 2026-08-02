# findat-x1-openai single-file deployment fix

The previous Dashboard deployment failed because `index.ts` imported `../_shared/cors.ts`, while only `index.ts` was uploaded.

This package now has a self-contained function:

`supabase/functions/findat-x1-openai/index.ts`

Paste that complete file into the Supabase Dashboard editor. Do not add a `_shared` import or a separate `cors.ts` file.

Use the exact function name `findat-x1-openai`, keep JWT verification enabled, and set these Edge Function secrets:

- `OPENAI_API_KEY` = a new, unexposed OpenAI API key
- `OPENAI_MODEL` = `gpt-5-mini`

The OpenAI model remains configurable by changing `OPENAI_MODEL` in Supabase Secrets.
