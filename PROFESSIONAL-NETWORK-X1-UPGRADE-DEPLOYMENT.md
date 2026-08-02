# FINDAT Professional Network, Profiles, Analytics and x1 Upgrade

This package preserves the existing FINDAT system and adds only the requested professional-network, profile, analytics, Developments and x1 changes.

## Deployment order

### 1. Run the new SQL migration

Open **Supabase Dashboard → SQL Editor**, paste and run:

`FINDAT-PROFILE-SOCIAL-ANALYTICS-X1-UPGRADE.sql`

The migration adds:

- profile covers, biography, industry and region fields;
- upgraded profile and collaboration directory functions;
- registration-avatar import;
- privacy-controlled article analytics events;
- transparent trending scores with time decay and anti-spam limits.

### 2. Redeploy the Administrator account function

Redeploy:

`supabase/functions/findat-admin-users/index.ts`

This allows Account Registry search and profile viewing to receive the expanded profile fields.

### 3. Upload the complete website package

Replace the website repository files with the contents of this package. Keep the directory structure unchanged because `index.html` loads the protected `.fdx` assets from `assets/data`.

### 4. Keep the existing authentication setting

In **Authentication → Providers → Email**:

- **Allow new users to sign up:** ON
- **Confirm email:** OFF

A normal email/password registration now requires a profile picture. A Google registration can use the verified Google profile image supplied by Google.

## What the upgrade does

- Removes the visual scroll-through gap between the Writing Desk header and Feed/My work/Saved/Network tabs.
- Displays all profile portraits as circles.
- Adds profile cover/banner upload and removal.
- Adds member profile viewing and recent-publication lists.
- Adds Account Registry search by name, username, email, organisation, telephone, role, country or region.
- Adds transparent feed ranking using recent unique impressions/views, reactions, comments, reposts, saves, shares, followed-author relevance and time decay.
- Adds creator analytics for publications and follower organisation/location distributions.
- Uses only location and organisation information supplied in user profiles; it does not secretly infer precise location.
- Adds x1 buttons to the social composer and publication editor.
- Adds verified x1 agent actions for Writing Desk, new drafts, Network, Messages, Analytics and Profiles.
- Adds aggregate user-approved writing memory to Knowledge. It records writing-pattern statistics rather than passwords, private prompts or full hidden model data.
- Keeps the existing OpenAI, embedded Knowledge/RAG and optional local Ollama fallback sequence.
- Makes the Developments card informational; x1 opens only through **Open application**.
- Removes landing-page **Learn more** buttons and local-browser labels.

## Analytics notes

Analytics start accumulating after this migration is deployed. Historical impressions and views that occurred before deployment cannot be reconstructed. Existing likes, reposts, comments and bookmarks are included in ranking immediately.

Only a publication owner or Administrator can read detailed event analytics. Normal members can see aggregate public engagement and the ranked feed.

## x1 adaptive intelligence boundary

x1 learns from user-approved FINDAT content through retrieval and aggregate writing-pattern memory. It does not reverse-engineer, duplicate or retrain itself from proprietary ChatGPT internals. When OpenAI is unavailable, x1 falls back to the existing embedded Knowledge/RAG response system and, when configured, a local Ollama model.

## No secrets in GitHub

This package contains no OpenAI, Supabase service-role, email-provider or WhatsApp secret. Keep secrets only in Supabase Edge Function Secrets.
