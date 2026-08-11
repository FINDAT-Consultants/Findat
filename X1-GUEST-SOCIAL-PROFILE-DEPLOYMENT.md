# FINDAT x1 Guest Access, Profiles and Social Intelligence Deployment

This package preserves the existing FINDAT applications and adds only the requested x1, profile, Writing Desk and landing-page changes.

## 1. Run the supplied SQL

Open **Supabase Dashboard → SQL Editor**, paste the complete contents of:

```text
FINDAT-X1-GUEST-SOCIAL-PROFILE-UPGRADE.sql
```

Run it once. It adds:

- profile cover/banner storage references;
- the complete professional-member directory used by profile viewing;
- restricted guest x1 usage logging;
- publication impression tracking and audience analytics RPCs.

## 2. Deploy the updated x1 Edge Function

Deploy this folder with the exact function name:

```text
supabase/functions/findat-x1-openai
```

The included `supabase/config.toml` deliberately contains:

```toml
[functions.findat-x1-openai]
verify_jwt = false
```

This does **not** expose the OpenAI key. The key remains server-side. The function verifies signed-in sessions when supplied and separately identifies guest browser sessions, applies lower guest limits and logs only usage metadata.

### Required secret

```text
OPENAI_API_KEY = your_new_unexposed_OpenAI_key
```

### Recommended secrets

```text
OPENAI_MODEL = gpt-5-mini
OPENAI_REASONING_EFFORT = low
OPENAI_MAX_OUTPUT_TOKENS = 1400
X1_OPENAI_HOURLY_LIMIT = 30
X1_OPENAI_DAILY_LIMIT = 150
X1_OPENAI_GUEST_HOURLY_LIMIT = 8
X1_OPENAI_GUEST_DAILY_LIMIT = 25
X1_OPENAI_GUEST_MAX_PROMPT_CHARS = 6000
X1_OPENAI_TIMEOUT_MS = 55000
X1_GUEST_HASH_SALT = replace-with-a-long-random-secret
```

Do not put these secrets in GitHub, `index.html`, browser JavaScript or the `.fdx` files.

## 3. Replace the website files

Upload the complete contents of this package to the website repository. Keep the directory structure unchanged, especially:

```text
assets/js/secure-loader.js
assets/data/页面7.fdx
assets/data/样式8.fdx
assets/data/逻辑9.fdx
```

The protected production assets have been rebuilt from the updated integration source.

## 4. Registration and profile images

Keep public Client registration enabled and **Confirm email off** under:

```text
Authentication → Providers → Email
```

The signup form now requires a profile picture. Google registration continues to use the Google profile image when available. Existing profile Storage policies already permit each signed-in user to manage files under:

```text
findat-v1/profiles/<user-id>/
```

Profile pictures render as circles. Cover pictures are uploaded from the profile editor and stored as `cover.jpg` in the same user folder.

## 5. x1 operating model

x1 now follows this failover order:

1. OpenAI through the secured Supabase Edge Function;
2. the existing local Ollama endpoint, when configured and available;
3. the embedded x1 retrieval, rules and intent engine.

Guest visitors can use x1 without signing in, under restricted quotas. Signed-in users retain the larger configured allowance.

The adaptive component uses the user's own publications and aggregate writing characteristics as retrieval/style context. It does not copy OpenAI weights, expose hidden prompts or silently republish previous writing. Knowledge imports and published FINDAT material remain available to the existing x1 evidence index.

## 6. Writing Desk social intelligence

The Writing Desk now includes:

- engagement-weighted trending order;
- publication views and unique-viewer tracking;
- follower organisation and country/region summaries;
- an audience map visualization based on member profile locations;
- an x1 assistant for publication planning, drafting and analysis.

x1 only inserts text into the editor after the user explicitly chooses **Insert answer into current editor**. It does not autonomously publish, message people or perform unapproved external actions.

## 7. Verification

After deployment, verify:

1. Open the landing page while signed out and choose **Developments → Open application**.
2. Ask x1 a question. Confirm the response identifies guest access or falls back to the local engine without requesting login.
3. Register a test Client with a profile picture.
4. Open the profile editor and upload a cover image.
5. Open Writing Desk, view another member's profile, publish a test article and open its Analytics view.
6. Open Administrator → Account registry and test the search field.
