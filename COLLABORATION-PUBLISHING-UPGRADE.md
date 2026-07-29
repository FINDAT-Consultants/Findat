# FINDAT Collaboration and Delegated Publishing Upgrade

## Deployment order

1. Open **Supabase → SQL Editor → New query**.
2. Paste and run `FINDAT-COLLABORATION-PUBLISHING-UPGRADE.sql`.
3. Confirm the query reports success.
4. Deploy the complete website package to Netlify, replacing the previous files.
5. Hard-refresh the website with **Ctrl + Shift + R**. On mobile, close and reopen the site once.

No new Edge Function is required. Keep the existing authentication functions deployed.

## Workflow

### Publishing

- The normal **Publish article** button appears only for Administrators.
- An Administrator can select one or more articles in **Review & Approval** and assign an active Consultant as the publisher.
- Only that Consultant sees a separate **Publish assigned article** action for those specific articles.
- The assignment does not give the Consultant a general publishing privilege.

### Collaboration

- The former Collaborator dropdown is now a **Collaborators** button.
- The article author or an Administrator can select up to five active FINDAT profiles.
- The picker displays names and profile avatars/initials without role labels.
- Users can click their account chip in the workspace header to upload or remove a profile picture; the image is resized and stored in Supabase Storage.
- Selected people receive a request saying who invited them and which paper is involved.
- Invitees can accept or reject from the collaboration-request button in the workspace header.
- Accepted collaborators receive editing access to that paper. Ownership and approval controls remain protected.

### Published byline layout

- The author or an Administrator can drag each contributor card on the byline layout board.
- The face and name are one locked card and always move together.
- The minus and plus controls resize the card.
- The saved positions and sizes are stored in `findat_articles.contributor_layout` and appear on the published article.

## New Postgres objects

- `findat_profiles.avatar_url`
- `findat_article_collaborators`
- `findat_articles.contributor_layout`
- `findat_articles.publisher_id`
- `findat_articles.publisher_assigned_by`
- `findat_articles.publisher_assigned_at`
- Collaboration-directory, invitation-response and delegated-publishing RPC functions

The migration enforces the five-collaborator limit, accepted-collaborator access, Administrator-only assignment and article-specific Consultant publication in Postgres/RLS—not only in the browser interface.


## Collaboration reliability follow-up

For existing deployments, also run `FINDAT-COLLABORATION-REQUESTS-RELIABILITY-FIX.sql` and deploy the latest website build. This adds durable response history and Realtime collaboration updates.
