# x1 | ProATR OpenAI API deployment

This upgrade keeps the existing embedded RAG, local Ollama option, document analysis, workflow commands, reconciliation tools and Writing Desk features. OpenAI is added as the preferred synthesis provider for authenticated users, with automatic fallback to the existing local response engine.

## Security requirement

Never put an OpenAI secret key in `findat-auth-config.js`, HTML, JavaScript, GitHub, or the ZIP. Store it only as a Supabase Edge Function secret.

Any key pasted into chat, source code, screenshots or public logs must be revoked and replaced before deployment.

## Deploy

1. Run `FINDAT-X1-OPENAI-API-UPGRADE.sql` in the Supabase SQL Editor.
2. Set a newly generated OpenAI project key as a Supabase secret:

   ```bash
   supabase secrets set OPENAI_API_KEY="YOUR_NEW_OPENAI_PROJECT_KEY"
   ```

3. Optional provider settings:

   ```bash
   supabase secrets set OPENAI_MODEL="gpt-5.6-luna"
   supabase secrets set OPENAI_REASONING_EFFORT="low"
   supabase secrets set OPENAI_MAX_OUTPUT_TOKENS="1400"
   supabase secrets set X1_OPENAI_HOURLY_LIMIT="30"
   supabase secrets set X1_OPENAI_DAILY_LIMIT="150"
   ```

4. Deploy the authenticated Edge Function:

   ```bash
   supabase functions deploy findat-x1-openai
   ```

5. Run `FINDAT-X1-OPENAI-API-VERIFY.sql`.
6. Deploy the complete website package and hard-refresh the browser.

## Runtime behavior

- Browser sends the authenticated Supabase access token to `findat-x1-openai`.
- The Edge Function verifies the user and confirms that the FINDAT profile is active.
- Only the current prompt, limited recent chat context and selected evidence passages are sent to OpenAI.
- The OpenAI key never reaches the browser.
- `store: false` is requested for Responses API calls.
- Prompt and response text are not written to `findat_ai_usage`; only model, token counts, status, character counts and request ID are retained for quota and audit purposes.
- Operational workspace commands remain local and are not delegated to OpenAI.
- If OpenAI is unavailable or not configured, x1 automatically uses the existing Ollama or embedded RAG response path.
