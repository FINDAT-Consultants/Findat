# FINDAT Attention Fixes Deployment

This build keeps all existing FINDAT functionality and fixes the requested editorial, notification, data-tool, Administrator and recording-thumbnail issues.

## 1. Deploy the website

Extract `FINDAT-Supabase-Editorial-Notifications-Admin-Thumbnail-Fix.zip` and replace the current Netlify deployment. Hard-refresh with `Ctrl + Shift + R`.

## 2. Update the Administrator Edge Function

In Supabase, open **Edge Functions → findat-admin-users**, replace `index.ts` with `findat-admin-users-updated.ts`, keep **Verify JWT enabled**, and deploy. This is required for creating additional Administrator accounts and promoting an existing Client or Consultant.

## 3. Update the built-in course thumbnail metadata

Run `FINDAT-ATTENTION-FIXES-UPGRADE.sql` in the Supabase SQL Editor. The actual `Classes/Data-Thumbnail.jpg` file is included in the website package.

## Main fixes

- Consultant **Save Editorial Changes** uses a direct update for an existing article.
- Bell notifications are clickable. Comment notifications open a popup where the discussion can be viewed and answered.
- Statistical Charts & Tables and Python Studio are separate aligned controls and remain closed until clicked.
- Run Python has a play icon.
- Administrators can create additional Administrators and promote Client/Consultant accounts. Existing Administrator rows stay grey and protected.
- Cloud instruction now says “Click the arrow to access FINDAT Cloud”.
- `Classes/Data-Thumbnail.jpg` is included and used for the built-in recording/course card before video playback.
