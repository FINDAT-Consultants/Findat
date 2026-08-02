# x1 | ProATR — Supabase Dashboard Setup

This is the simplest deployment path. No Node server is required.

## Before starting

1. Delete/revoke the OpenAI key that was posted in chat.
2. Create a new project API key in the OpenAI Platform.
3. Never paste that key into `index.html`, `findat-auth-config.js`, GitHub, or any browser JavaScript file.

## 1. Create the usage table

In Supabase Dashboard:

1. Open **SQL Editor**.
2. Click **New query**.
3. Copy all SQL from `FINDAT-X1-OPENAI-API-UPGRADE.sql`.
4. Click **Run**.

This creates `public.findat_ai_usage`, its indexes, and Row Level Security policies. It stores usage metadata only—not chatbot prompts or answers.

## 2. Add the OpenAI secret

In Supabase Dashboard:

1. Open **Edge Functions**.
2. Open **Secrets** or **Manage secrets**.
3. Add:

```text
OPENAI_API_KEY = YOUR_NEW_OPENAI_PROJECT_KEY
```

Recommended optional secrets:

```text
OPENAI_MODEL = gpt-5-mini
OPENAI_REASONING_EFFORT = low
OPENAI_MAX_OUTPUT_TOKENS = 1400
X1_OPENAI_HOURLY_LIMIT = 30
X1_OPENAI_DAILY_LIMIT = 150
X1_OPENAI_TIMEOUT_MS = 55000
```

Do not manually add Supabase service-role or database secrets. Hosted Edge Functions already receive the required Supabase environment variables.

## 3. Deploy the Edge Function in the Dashboard

1. Open **Edge Functions**.
2. Choose **Deploy a new function** → **Via Editor**.
3. Name it exactly:

```text
findat-x1-openai
```

4. Replace the generated code with the contents of:

```text
supabase/functions/findat-x1-openai/index.ts
```

5. The function is self-contained. Do not create an `_shared` folder or `cors.ts` file.
6. Keep JWT verification enabled. Do not deploy this function as a public no-JWT endpoint.
7. Click **Deploy function**.

## 4. Confirm the website configuration

`findat-auth-config.js` is already configured to use:

```text
https://gmiqvpemuabjueyprwyl.supabase.co
findat-x1-openai
```

The publishable Supabase key in that file is browser-safe. Never replace it with a secret/service-role key.

## 5. Upload the website to GitHub

Upload the contents of this package to the GitHub repository used by the website. GitHub Pages may host the frontend because OpenAI is executed by Supabase, not by GitHub Pages.

## 6. Test

1. Open the deployed FINDAT website through `https://`, not by double-clicking `index.html`.
2. Sign in with an active FINDAT account.
3. Open x1 | ProATR.
4. The status should show that secure OpenAI synthesis is configured.
5. Ask a simple financial question.

## Troubleshooting

### “Log in to use OpenAI-powered x1 assistance”
The user is not signed in, the session expired, or JWT verification rejected the request.

### “x1 OpenAI service is not configured”
`OPENAI_API_KEY` is missing, or the function cannot read the default Supabase environment variables.

### “The OpenAI project key or permissions must be checked”
The new OpenAI key is invalid, revoked, belongs to the wrong project, or lacks permission to create Responses.

### The local x1 answer appears instead
The frontend intentionally falls back to its embedded financial engine when the Supabase/OpenAI request fails. Check **Edge Functions → Logs** for `findat-x1-openai`.
