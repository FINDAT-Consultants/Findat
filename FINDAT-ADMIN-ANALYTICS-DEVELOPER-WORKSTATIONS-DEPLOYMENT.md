# FINDAT Administrator Analytics, Workstations and Developer Studio

This upgrade preserves the existing FINDAT authentication, publishing, collaboration, courses, Cloud storage and article workflow while adding the requested administrator features.

## 1. Run the Postgres upgrade

In Supabase, open **SQL Editor → New query** and run the complete contents of:

`FINDAT-ADMIN-ACTIVITY-WORKSTATIONS-DEVELOPER-UPGRADE.sql`

Then run:

`FINDAT-ADMIN-ACTIVITY-WORKSTATIONS-DEVELOPER-VERIFY.sql`

The verification results should show these tables:

- `findat_platform_events`
- `findat_cloud_workstations`
- `findat_site_patches`

The listed RPC functions should also appear, and `site_patches_realtime_enabled` should be `true`.

## 2. Replace the administrator Edge Function

The existing `findat-admin-users` function must be replaced because the new version can:

- create Administrator, Consultant and Client accounts;
- promote an existing Client or Consultant to Administrator;
- preserve role information in Supabase Auth `app_metadata`;
- continue confirming email, changing passwords and suspending accounts.

Dashboard-ready code:

`supabase/dashboard-functions/findat-admin-users.ts`

Function name:

`findat-admin-users`

Keep **Verify JWT enabled**.

## 3. Deploy the Developer Studio build function

Create a new Supabase Edge Function named:

`findat-developer-deploy`

Paste the code from:

`supabase/dashboard-functions/findat-developer-deploy.ts`

Keep **Verify JWT enabled**. The function separately verifies that the signed-in Postgres profile is an active Administrator.

## 4. Create a Netlify build hook

In Netlify, create a build hook for the FINDAT production branch. Copy the generated private hook URL.

In Supabase, open **Edge Functions → Secrets**, create:

`FINDAT_NETLIFY_BUILD_HOOK`

Use the complete Netlify build-hook URL as its value and save it. Never put this URL in frontend JavaScript or commit it to Git.

The Developer Studio's **Trigger Netlify deploy** button will call the authenticated Supabase Edge Function, which reads the private secret and requests a Netlify build.

## 5. Deploy the website

Deploy all files in this package to Netlify, replacing the current site files. Then perform a hard refresh:

`Ctrl + Shift + R`

On mobile, close and reopen the site once.

## Implemented workflow

### Consultant editorial saving

The Consultant **Save Editorial Changes** button now uses a Postgres `UPDATE` constrained by article ID for existing papers. It does not use an insert-style upsert that can be rejected by Consultant row-level-security rules. All editable article fields, media and supported attachments are saved before the editor clears.

### Clickable notifications

Bell notifications now include **Open discussion** or **Open article**. Comment notifications open the shared article and focus the comment/reply interface.

### Visual analytics and Python

The Visual Studio and Python Studio buttons are aligned side by side. The visual builder supports category/value selection, aggregation and previews for bar, line, area, pie, doughnut and scatter visuals, together with article tables and statistical summaries. **Run Python** has a play icon.

This is a focused article-reporting studio; it is not a replacement for the full Power BI or Tableau product suites.

### Administrator accounts

An Administrator can create another Administrator directly and can promote an existing Client or Consultant. The privileged Auth change is performed server-side and the user should sign out and sign in again after promotion.

### Cloud workstations

Administrators can assign numbered FINDAT Cloud workstations to accounts and set workstation passwords. Passwords are hashed in Postgres with `pgcrypto`; password hashes are never returned to the browser.

The Cloud wording is now:

`Click the arrow to access FINDAT Cloud`

### Activity Dashboard and audit trail

The dashboard records first-party FINDAT events including page/workspace views, login, logout, article opening and saving, information retrieval, comments, workstation administration and Developer Studio updates. It combines these with the existing audit table.

Visitor origin is a **country signal**, not precise GPS tracking. Signed-in accounts use their profile country when available; anonymous visits use browser timezone/language as a coarse signal. Exit events are best-effort browser signals such as page hidden, page closed/navigated away or explicit sign-out.

### Developer Studio

- HTML, CSS and JavaScript patches are stored in Supabase and can apply immediately through Realtime.
- Python runs in an isolated browser worker.
- Java source can be stored and structurally validated.
- Java is not compiled or executed inside the browser. Safe Java execution requires a separate isolated build service/container.
- Production Netlify rebuilds require the private build-hook secret described above.

## Security note

Live JavaScript patches can alter the application. Keep Administrator accounts protected with strong unique passwords, use the Developer Studio on a staging deployment first, and review changes before triggering production builds.
