# Writing Desk social workspace

This additive upgrade gives every signed-in FINDAT user a social-style Writing Desk while retaining the existing article editor, approval rules, collaboration controls, publications, profiles and notifications.

## Included experience

- Feed, My work, Saved and Network views
- Post-style article composer that expands into the full existing editor
- Published and private-work feed cards with profile identity, status, article preview and media
- Likes, reposts, bookmarks and share actions
- Threaded article discussions in a chat-style window
- Follow and unfollow controls
- Private member-to-member direct messages with unread counts
- Live Online, Away and Offline status on avatars, member cards, chat lists and the active conversation header
- Animated “typing…” indicators restricted to the two active message participants
- Built-in emoji pickers for direct messages and article discussions
- Responsive three-column desktop layout and mobile feed/chat layout
- Live refresh through Supabase Realtime, with the existing timed refresh retained as fallback

## Deployment

1. Run `FINDAT-WRITING-DESK-SOCIAL-WORKSPACE-UPGRADE.sql` in the Supabase SQL Editor.
2. Run `FINDAT-WRITING-DESK-SOCIAL-WORKSPACE-VERIFY.sql` and confirm all five public tables plus the two `realtime.messages` policies are listed.
3. Deploy the complete site package.
4. Hard-refresh the browser with `Ctrl + Shift + R`.

The Writing Desk still loads when the SQL has not yet been applied, but social actions show a setup notice until the new tables exist.


## Live status and typing behavior

- **Online** means the user has an authenticated FINDAT session open and active.
- **Away** appears after five minutes without interaction, when the tab is hidden, or when the browser window loses focus.
- **Offline** means no active Realtime Presence connection is currently reported for that user.
- Typing events are short-lived Broadcast signals and are not written to the direct-message table.
- Emoji characters are stored as ordinary Unicode text in the existing comments and messages.

The browser subscribes to private Realtime channels. The migration adds read/write policies on `realtime.messages`; deploy the migration before testing presence or typing with two signed-in accounts.
