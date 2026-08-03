# FINDAT Collaboration, Notifications and Profile Fix

This update preserves the existing FINDAT features and repairs the collaboration and profile-picture workflow shown in the supplied screenshots.

## Corrected behaviour

- The collaborator RPC no longer fails with `column reference "article_id" is ambiguous`.
- A selected profile updates the visible `0 / 5` counter immediately.
- Collaboration invitations are stored in `findat_article_collaborators`.
- Each invitation and response creates a per-user record in `findat_notifications`.
- The top-right control is a bell icon with an unread count.
- Recipients can accept or reject from the notification window.
- Senders receive accepted or rejected response notifications.
- Completed notification history can be cleared; unanswered requests remain available.
- Pending invitations no longer expose an article before the recipient accepts.
- The Author & collaborators section displays the current collaboration state.
- Profile pictures first upload to Supabase Storage. If the Storage request is unavailable, the resized image is saved in Supabase Postgres as a reliable fallback.

## Deployment order

### 1. Update Supabase Postgres

Open **Supabase → SQL Editor → New query**.

Paste and run:

`FINDAT-COLLABORATION-NOTIFICATIONS-PROFILE-FIX.sql`

Wait for a successful result. The final verification row should show non-null names for the notification table and RPC functions.

### 2. Optional verification

Run:

`FINDAT-COLLABORATION-NOTIFICATIONS-PROFILE-VERIFY.sql`

Both Realtime fields should be `true`. The relevant public tables should show `rls_enabled = true`.

### 3. Deploy the website

Deploy all files from the updated ZIP to Netlify, replacing the previous deployment. Then hard-refresh the desktop browser with `Ctrl + Shift + R`. On mobile, close and reopen the website once.

## Test with two sessions

1. Sign in as the article author in one browser.
2. Sign in as another user in an Incognito window or another device.
3. Create or open a draft with a title and content.
4. Click **Collaborators**, select a user, and confirm the counter changes to `1 / 5`.
5. Click **Send requests**.
6. The recipient should see a bell count of `1` and a collaboration request.
7. Accept or reject it.
8. The sender should receive a response notification.
9. For acceptance, the article becomes visible to the collaborator only after acceptance.
10. Upload a profile picture and confirm that the picture replaces the initials.

No new Edge Function is required.
