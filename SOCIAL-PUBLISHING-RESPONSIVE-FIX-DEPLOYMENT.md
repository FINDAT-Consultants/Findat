# FINDAT social, publishing and responsive repair

## What was fixed

The private-message failure came from the old `findat_direct_messages` INSERT policy. It checked the recipient by directly querying `findat_profiles`. Normal members only have direct table visibility to their own profile, so another valid recipient could be hidden by profile RLS and the message insert was rejected.

The repair adds security-definer helper functions that safely verify active accounts and article access without exposing private profile rows. It then rebuilds policies for:

- Private messages
- Likes and reposts
- Comments and replies
- Saved posts
- Follows
- Article saving, publishing and republishing

The frontend now lets Postgres fill sender, author, follower and user IDs from `auth.uid()`. It also keeps available social actions working when only one social query fails, provides clearer permission errors, and adds a clipboard fallback for Share.

The responsive update reduces the Network search field width and adds layouts for Apple and Android phones, iPads, tablets, small laptops, portrait mode and landscape mode.

## Supabase deployment

1. Open **Supabase Dashboard → SQL Editor**.
2. Run the complete file:

   `FINDAT-SOCIAL-PUBLISHING-RESPONSIVE-FIX.sql`

3. Run:

   `FINDAT-SOCIAL-PUBLISHING-RESPONSIVE-VERIFY.sql`

4. Confirm the helper functions, tables, policies and authenticated grants are returned.
5. Sign out of FINDAT and sign in again so the browser starts with a fresh Auth session.

The same repair is included as the repository migration:

`supabase/migrations/20260803210000_findat_social_publishing_responsive_fix.sql`

For Supabase CLI deployments, push the migration using your normal migration workflow.

## Website deployment

Deploy the complete patched repository, including:

- `index.html`
- `assets/data/样式8.fdx`
- `assets/data/逻辑9.fdx`
- `assets/js/secure-loader.js`
- `integration-source/styles.integrated.css`
- `integration-source/app.integrated.js`
- the new SQL migration and verification files

Do not deploy only the readable `integration-source` files. The public site loads the protected `.fdx` assets.

## Functional test

Use two active accounts and test:

1. Send a private message in both directions.
2. Like and unlike a published post.
3. Comment and reply.
4. Repost and remove the repost.
5. Save and unsave a post.
6. Share a publication link.
7. As an Administrator, publish a draft, unpublish it, then publish it again.
8. On a Client account, save a draft and submit it for approval.
9. Test the Network search on a narrow phone screen.
10. Rotate a phone or tablet between portrait and landscape.

## Security note

The browser still uses only the Supabase publishable key. Sender and author identities are assigned by Postgres from the authenticated JWT; no service-role key is added to the website.
