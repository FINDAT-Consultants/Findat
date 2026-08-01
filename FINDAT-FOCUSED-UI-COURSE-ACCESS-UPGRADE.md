# FINDAT focused UI and course-access upgrade

This package is based on `FINDAT-Supabase-Google-Authentication(1).zip` and preserves the existing Cloud desktop, authentication methods, logout controls, role workspaces, article workflow, collaboration, notifications, Python charts, course manager, wallpapers, document preview and visual styling.

## Changes in this build

### Landing page

- Removed the standalone **G** shortcut.
- Removed the landing-page circular human-profile shortcut.
- Kept **Continue with Google** inside Login and Registration so Google authentication remains available.
- Reworded user-facing implementation or testing language that did not help the visitor.

### Recordings

- `Classes/Data-Thumbnail.jpg` is the protected image used for the **Data Analytics Foundations** course card and the built-in lesson **How Data Analytics Work per Domain**.
- The course and lesson titles are placed above the video.
- **FINDAT Original** and **Recorded masterclass** overlays are removed so text does not cover the presenter.

### Writing and review workflow

- Statistical Charts & Tables and Python Studio start closed.
- Opening either tool changes its label from **Open** to **Close**; clicking again closes it.
- Opening one tool closes the other.
- Once an Administrator assigns a Pending approval article to a Consultant publisher, it leaves the Administrator review queue and appears in the assigned Consultant's queue.
- Successful form and submit actions clear their transient inputs and close the active panel or modal where appropriate.

### Administrator accounts

- Administrators can create Client and Consultant accounts.
- Only an existing **Consultant** can be promoted to Administrator.
- A Client cannot be promoted to Administrator in either the interface or the protected Edge Function.

### Course pricing, payments and timed access

Administrators can set every course as Free or Paid, choose **ZMW**, **USD** or **GBP**, enter a price, and set an access period of at least 30 days.

Free courses open to everyone. Paid courses remain locked until a signed-in user submits a payment reference and an Administrator approves it. Approval creates a timed enrollment. Lesson rows and private course media are protected by Postgres RLS and Storage policies, not only by hidden buttons.

The **My learning** window records:

- course enrollments and progress;
- access-expiry dates;
- payment history and status;
- certificate numbers issued after course completion.

This build implements an Administrator-verified payment-reference workflow because no card, mobile-money or bank payment gateway was specified. A live gateway can later call the same enrollment logic after a verified payment webhook.

## Required deployment

1. In Supabase SQL Editor, run `FINDAT-COURSE-PRICING-PAYMENTS-ACCESS-UPGRADE.sql`.
2. Run `FINDAT-COURSE-PRICING-PAYMENTS-ACCESS-VERIFY.sql` and confirm both new tables and all four RPC functions are present.
3. Replace the deployed `findat-admin-users` function with `findat-admin-users-updated.ts`, keep **Verify JWT ON**, and deploy it.
4. Deploy the complete website package to Netlify.
5. Hard-refresh the website with `Ctrl + Shift + R`.

## Payment test

1. Create a paid course and publish it.
2. Sign in as a Client and open Recordings.
3. Select the paid course and submit a payment method/reference.
4. Sign in as Administrator, open Course Manager, and approve the request.
5. Return to the Client account and confirm that the course opens and appears under **My learning** with an expiry date.
