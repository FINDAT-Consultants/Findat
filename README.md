# FINDAT — Supabase-only Document Storage

This build sends every uploaded, dropped, pasted, created, edited, copied, moved,
or restored document directly to the Supabase Storage bucket
`findat-documents`.

## Storage behaviour

```text
Drop or choose a document
  → keep the file temporarily in memory
  → upload the bytes directly to Supabase Storage
  → wait for a successful Storage response
  → retain only lightweight icon/path metadata in IndexedDB
  → display a green ✓ on the desktop document icon
```

Document bytes are **not** retained in `localStorage`, IndexedDB, or a browser
file cache. Opening or exporting a document downloads it from Supabase into
memory for that operation only.

FINDAT encodes each virtual path under:

```text
findat-v1/files/
findat-v1/folders/
```

Folders use zero-byte marker objects because object-storage folders are key
prefixes rather than physical directories.

## Desktop icon arrangement

Documents dropped on the FINDAT desktop are placed in the next free position in
a horizontal grid. The first document row begins below FINDAT Cloud,
Applications, and Trash; documents then fill from left to right before continuing
on the next row. Existing saved positions are placed first, so adding or
refreshing a document never moves an icon that the user has already positioned.
Icons can be dragged freely, their exact positions are retained across refreshes
and resizes, and collision protection prevents one icon from hiding another.


## Document opening and mobile access

Word, Excel, PowerPoint and PDF documents now open in the FINDAT Preview window
instead of starting an automatic download. The Download button remains a
separate user action. Mobile devices open items with one tap and use a full-size
viewer.

A compact Supabase metadata index is maintained at `findat-v1/index.json` so a
phone can show cloud document icons quickly. FINDAT still performs a full
Storage reconciliation in the background, and document bytes remain remote-only.


## Built-in wallpapers and cross-device custom wallpaper

The desktop includes Monterey Dark, Monterey Light, FINDAT Office Light and
FINDAT Office Dark, while retaining the existing gradient choices. Monterey
Dark is the default for new and migrated installations.

A Custom wallpaper is compressed in memory, uploaded to Supabase Storage, and
then applied from its public cloud URL. The selected wallpaper and fit mode are
stored under `findat-v1/settings/`, so another computer or phone connected to
the same FINDAT deployment receives the same wallpaper automatically. No image
bytes are kept in browser storage by the new custom-wallpaper flow.

## Required Supabase setup

In the Supabase SQL Editor, run:

```text
cloud/FINDAT-STORAGE-ONLY-SETUP.sql
```

This creates the `findat-documents` bucket and the Storage policies required by
the browser application. No custom FINDAT PostgreSQL document table is used.

## Deployment test

1. Run the Storage setup SQL.
2. Deploy the complete project.
3. Hard-refresh with `Ctrl + Shift + R`.
4. Drop a small document on the FINDAT desktop.
5. Wait for the desktop icon to receive a green ✓.
6. Confirm the object appears in `Storage → findat-documents → findat-v1 → files`.
7. Refresh another device and confirm the document icon is rebuilt from Supabase.

## Security

Only a browser-safe Supabase Publishable key belongs in
`cloud/cloud-config.js`. Never put a Secret key, service-role key, or S3 secret
in frontend code. The included collaborative policies allow anonymous website
visitors to list, upload, replace, and delete FINDAT objects; add Supabase Auth
and owner-based policies before storing private documents.


## Supabase Auth, Postgres and role-based workflow

The website header now provides **Forgot Username or Password**, **Register**,
username, password and Login controls backed by Supabase Auth. Account profiles,
roles, articles and approval records are stored in Supabase Postgres. Public
registration always creates a Client; Consultant accounts are created by an
Administrator. Clients are restricted to writing their own article text, while
assigned Consultants handle editorial changes and media; the Administrator role is protected and unavailable in any
browser role selector.

Apply `FINDAT-AUTH-RBAC-POSTGRES-SETUP.sql`, deploy the included Edge Functions,
and create the first Administrator using `ADMIN-BOOTSTRAP-EXAMPLE.txt`. Complete
instructions are in `AUTH-POSTGRES-RBAC-DEPLOYMENT.md`. No Administrator password,
service-role key or Supabase secret key is present in the frontend.
## Google authentication

This build includes Google OAuth sign-in through Supabase Auth while preserving username/password sign-in and Postgres role controls. Configure the Google provider and run `FINDAT-GOOGLE-AUTH-PROFILE-UPGRADE.sql` as described in `FINDAT-GOOGLE-AUTH-SETUP.md`.


## Focused UI and paid-course access upgrade

The current build removes the landing-page Google shortcut and profile-circle shortcut while retaining Google authentication inside Login and Registration. The supplied `Data-Thumbnail.jpg` is protected and used for the Data Analytics Foundations course card and its built-in video poster, with the course and lesson headings moved above the video.

Course Manager now supports Free/Paid access, ZMW/USD/GBP pricing and an access period of at least 30 days. Paid-course payment references are stored in Postgres and require Administrator verification before a timed enrollment unlocks lessons and private course media. Users can review enrollments, payment history, progress, expiry dates and awarded certificate numbers under **My learning**.

Run `FINDAT-COURSE-PRICING-PAYMENTS-ACCESS-UPGRADE.sql`, verify it with `FINDAT-COURSE-PRICING-PAYMENTS-ACCESS-VERIFY.sql`, and deploy `findat-admin-users-updated.ts`. See `FINDAT-FOCUSED-UI-COURSE-ACCESS-UPGRADE.md`.

## Writing Desk social workspace

The Writing Desk now uses a professional social-feed and chat-style interface for every authenticated user while retaining the existing article editor, collaboration, approval, publishing, notification and role-based workflows. Users can browse Feed, My work, Saved and Network views; react to or repost publications; save articles; follow professional connections; join threaded discussions; exchange private direct messages; see Online, Away and Offline status; view live typing indicators; and insert emojis in messages and discussions.

Before deploying the interface, run `FINDAT-WRITING-DESK-SOCIAL-WORKSPACE-UPGRADE.sql` in the Supabase SQL Editor. Use `FINDAT-WRITING-DESK-SOCIAL-WORKSPACE-VERIFY.sql` to confirm the new tables and policies, then deploy the complete project. Full notes are in `WRITING-DESK-SOCIAL-WORKSPACE.md`.

For current deployments, also run `FINDAT-SOCIAL-PUBLISHING-RESPONSIVE-FIX.sql`. This repairs private-message and social-action RLS, restores article save/publish/republish permissions, and accompanies the cross-device responsive update. Verification and deployment steps are in `SOCIAL-PUBLISHING-RESPONSIVE-FIX-DEPLOYMENT.md`.

## x1 | ProATR secure OpenAI integration

The Financial Assistant now prefers an authenticated Supabase Edge Function for
OpenAI synthesis, while retaining local Ollama and embedded RAG fallback. No
No OpenAI secret is included in this package. Store a newly generated key only in Supabase Edge Function Secrets. See `SUPABASE-DASHBOARD-SETUP.md`.

## Administrator Knowledge and automatic Client registration

The x1 Knowledge manager is opened from the Administrator sidebar and remains connected to the same built-in and imported x1 evidence index. The composer analytics shortcut and composer Knowledge shortcut are not displayed.

Run `FINDAT-AUTOMATIC-CLIENT-REGISTRATION-UPGRADE.sql` in the Supabase SQL Editor, then redeploy `findat-username-login`. New public Client and Google registrations activate immediately and can use FINDAT without Administrator confirmation. Administrators receive an informational registration notice. Administrator and Consultant accounts remain Administrator-created only.


## Registration notifications

Administrators continue to receive an in-system notice when a new Client registers, but the notice is informational and does not block access. The older approval-email and WhatsApp function remains available for manually reactivating suspended accounts.

## August 3, 2026 — x1 guest, profile and social intelligence upgrade

Deployment instructions for the latest requested upgrade are in:

```text
X1-GUEST-SOCIAL-PROFILE-DEPLOYMENT.md
```

Run the included SQL migration and redeploy `findat-x1-openai` before testing guest OpenAI access, profile covers and publication analytics.
