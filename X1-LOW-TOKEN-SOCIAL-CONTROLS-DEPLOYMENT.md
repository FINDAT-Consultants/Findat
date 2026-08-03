# FINDAT x1 Low-Token and Social Controls Deployment

This update is additive. It preserves the existing FINDAT applications, Supabase authentication, profiles, publications, Knowledge, reconciliation models, local x1 engine, Ollama fallback and guest x1 access.

## Included changes

- Recording start controls are aligned on the left beneath **Ready to begin**.
- The Writing Desk tab junction uses a translucent glass-blur bridge so scrolling content does not show clearly through the split.
- **Ask x1** uses the original x1 logo and includes **Clear** beside **Send**.
- Private messages include **Clear chat**. Clearing hides older messages for the current user only and does not delete the other participant's copy.
- The Network view has its own search field, search button and numbered pagination with previous/next arrows. Four profiles are shown per page.
- **People in FINDAT** shows two profiles; **See all** still opens Network.
- Published articles and research include compact speech controls: play/pause, stop, volume and an animated waveform. Browser voice availability determines the exact voice; x1 requests a slower, lower-pitch English voice when available.
- Administrators receive an **x1 Usage Settings** sidebar option with hard server-side controls for prompt size, output size, evidence, conversation history, quotas, cooldowns and daily token budgets.
- x1 uses its embedded local engine first for simple requests and reserves OpenAI for complex requests, live reconciliation data, detailed synthesis and explicit OpenAI requests.

## 1. Run the SQL migration

Open **Supabase Dashboard → SQL Editor**, paste and run:

```text
FINDAT-X1-LOW-TOKEN-SOCIAL-CONTROLS-UPGRADE.sql
```

This creates:

- `public.findat_x1_runtime_settings`
- `public.findat_message_clears`

It does not modify existing messages, accounts, publications or x1 usage records.

## 2. Redeploy the x1 Edge Function

Deploy:

```text
supabase/functions/findat-x1-openai/index.ts
```

Keep the function configuration unchanged:

```toml
[functions.findat-x1-openai]
verify_jwt = false
```

Guest access remains protected by restricted quotas and a hashed guest identifier. The OpenAI key remains inside Supabase Secrets.

## 3. Upload the website

Replace the website repository files with the contents of the updated ZIP. Upload the protected `.fdx` files and `assets/js/secure-loader.js` together because they use matching encryption keys.

## 4. Configure usage from the Administrator account

Log in as an Administrator and open:

```text
x1 Usage Settings
```

The included conservative defaults are:

- OpenAI enabled: yes
- Guest OpenAI enabled: yes
- Local engine first: yes
- Reasoning effort: none
- Maximum output tokens: 420
- Answer word limit: 240
- Member prompt characters: 4,500
- Guest prompt characters: 1,800
- Evidence passages: 5
- Characters per passage: 1,000
- Conversation turns: 3
- Member requests: 8/hour and 28/day
- Guest requests: 3/hour and 8/day
- Member cooldown: 15 seconds
- Guest cooldown: 45 seconds
- Member daily token budget: 90,000
- Guest daily token budget: 12,000

These are hard limits in the Edge Function. Even when a prompt asks for a very long answer, the server still applies the configured prompt, output and word limits.

## Existing secret

Keep the replacement OpenAI key in:

**Supabase Dashboard → Edge Functions → Secrets**

```text
OPENAI_API_KEY = your_unexposed_key
OPENAI_MODEL = gpt-5-mini
```

Do not place the key in GitHub, browser JavaScript or `index.html`.
