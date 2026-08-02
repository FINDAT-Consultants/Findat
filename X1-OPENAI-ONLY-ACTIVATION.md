# FINDAT x1 — OpenAI-only activation

This build makes the authenticated Supabase Edge Function `findat-x1-openai` the mandatory provider for all x1 conversational responses, including x1 opened from the Writing Desk. FINDAT Knowledge, uploaded documents, reconciliation tables and verified application state are supplied to OpenAI as context. No embedded RAG or Ollama chatbot response is shown when OpenAI is unavailable.

## Required Supabase deployment

1. In **Supabase Dashboard → Edge Functions**, deploy or replace the function named exactly `findat-x1-openai` using `supabase/functions/findat-x1-openai/index.ts`.
2. Keep **Verify JWT** enabled.
3. In **Edge Functions → Secrets**, set:

```text
OPENAI_API_KEY=your_new_unexposed_OpenAI_project_key
OPENAI_MODEL=gpt-5-mini
OPENAI_REASONING_EFFORT=low
OPENAI_MAX_OUTPUT_TOKENS=1400
X1_OPENAI_HOURLY_LIMIT=30
X1_OPENAI_DAILY_LIMIT=150
X1_OPENAI_TIMEOUT_MS=55000
```

4. Run `FINDAT-X1-OPENAI-API-UPGRADE.sql` if the `findat_ai_usage` table has not already been installed.
5. Upload the updated website files to the existing GitHub repository/hosting location.

## Live verification

The x1 startup health request now verifies the API key and configured model directly against OpenAI. A successful x1 request must appear in:

- **Supabase → Edge Functions → findat-x1-openai → Logs**
- `findat_ai_usage` with `provider = openai` and `status = completed`

If OpenAI rejects the key, model, quota, billing or rate limit, x1 displays an explicit error. It does not substitute a local chatbot answer.

## Writing Desk x1

Both Writing Desk controls are active:

- **x1 Agent** in the social composer
- Robot button in the publication editor

Clicking either control opens x1 directly, supplies the current Writing Desk or draft context, and submits that context to the OpenAI-backed x1 service.

## Security

Never place `OPENAI_API_KEY` in `index.html`, browser JavaScript, GitHub, or this ZIP. The previously exposed key must remain revoked.
