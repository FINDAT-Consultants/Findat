# FINDAT Collaboration Request Reliability Fix

This update keeps the existing FINDAT features and repairs the collaboration workflow.

## What changed

- Collaboration invitations are stored in `public.findat_article_collaborators` through an authenticated Supabase RPC.
- Incoming requests, sent invitations, accepted responses, rejected responses and cancelled invitations are visible in **Collaboration activity**.
- Accept and Reject actions save immediately to Postgres and remain visible as response history.
- The notification badge counts pending incoming requests only.
- Collaboration changes refresh instantly through Supabase Realtime when available, with a 10-second fallback refresh.
- A manual **Refresh** button is included.
- Article authors and Administrators can add or remove collaborators.
- Accepted collaborators can invite additional people, up to the existing maximum of five; they cannot remove other collaborators.
- All active Clients, Consultants and Administrators remain available in the picker, with names and profile pictures only.
- Collaboration actions are written to the existing FINDAT audit log.

## Deployment order

### 1. Update Supabase Postgres

Open **Supabase → SQL Editor → New query** and run:

`FINDAT-COLLABORATION-REQUESTS-RELIABILITY-FIX.sql`

The script is idempotent and can be run again if necessary.

### 2. Deploy the website

Deploy all files from the updated ZIP to Netlify, replacing the previous deployment.

Hard-refresh the website with `Ctrl + Shift + R`.

### 3. Test with two separate sessions

Use two separate browser sessions because one Supabase login replaces another login on the same website origin. A reliable test is:

- Administrator or Client in a normal browser window.
- Invitee in an Incognito/Private window, another browser, or another device.

Create or open an article, click **Collaborators**, select a person and click **Send requests**. The sender should see a pending outgoing entry. The invitee should see a numbered collaboration notification and can Accept or Reject it.

## No Edge Function change

This fix uses Postgres functions, RLS, Supabase Realtime and the existing authenticated session. No new Edge Function is required.
