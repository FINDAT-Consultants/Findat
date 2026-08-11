# Assurance Regent integration

Assurance Regent is integrated as a separate application under `adra_recovery_work/` and is surfaced in FINDAT **Developments** immediately after **x1 | ProATR**.

## Runtime boundaries

- FINDAT loads the Developments card from `assets/js/assurance-regent-integration.js`.
- The Open application button targets `adra_recovery_work/` by default. Set `window.ASSURANCE_REGENT_URL` before the integration script if the Node application is deployed at a separate origin.
- Assurance Regent keeps its own Node/Express application, protected browser bundle and application data folder inside `adra_recovery_work/`.
- `AR-06.png` is the application logo in the FINDAT card and inside the protected Assurance Regent interface.

## Supabase persistence

Assurance Regent uses the same FINDAT Supabase project URL as x1 | ProATR. Apply the five `2026081113*.sql` migrations in the root `supabase/migrations/` directory. Production operation requires server-side Supabase credentials and persists dynamic application state to `public.adra_recovery_state`; the existing memory, session, learning, records, MTS and workbook tables remain Supabase-backed as designed.

Server environment:

```dotenv
SUPABASE_URL=https://gmiqvpemuabjueyprwyl.supabase.co
SUPABASE_SECRET_KEY=<server-only Supabase secret/service key>
ADRA_REQUIRE_SUPABASE=true
```

Do not expose the Supabase server key in browser JavaScript.

## Shared OpenAI key with x1 | ProATR

Both x1 | ProATR and Assurance Regent use the server-side secret named `OPENAI_API_KEY`. x1 reads that secret inside `supabase/functions/findat-x1-openai`; the Assurance Regent Recovery Agent reads the same variable through `@openai/agents` on its Node server.

Deploy both services with the **same secret value**. The ZIP intentionally contains no API key value.

Example deployment sequence from a trusted shell where the shared key is already present in the environment:

```bash
# Set x1's Supabase Edge Function project secret from the same value.
supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"

# Start/deploy Assurance Regent with that same OPENAI_API_KEY in its server environment.
cd adra_recovery_work
npm start
```

The Recovery Agent remains server-only; no OpenAI secret is written into FINDAT or Assurance Regent browser assets.

## Supabase-only persistence update

Run `ASSURANCE-REGENT-SUPABASE-SETUP.sql` in the FINDAT Supabase SQL Editor before deploying Assurance Regent. The updated Assurance Regent server refuses to start without server-side Supabase credentials and does not write mutable application state to browser storage or a local JSON mirror. Set `ADRA_LOCAL_STATE_MIRROR=false`.
