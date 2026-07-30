# FINDAT Commerce, x1 Training and Monthly Cloud Access

This build uses `FINDAT-Supabase-Google-Authentication(1).zip` as its baseline and preserves the existing website, authentication, writing, collaboration, course, notification, Python, and Cloud features.

## Deployment order

### 1. Update Supabase Postgres

Open **Supabase → SQL Editor → New query** and run the complete contents of:

`FINDAT-COMMERCE-X1-CLOUD-ACCESS-UPGRADE.sql`

After it succeeds, run:

`FINDAT-COMMERCE-X1-CLOUD-ACCESS-VERIFY.sql`

The verification output should show non-null table and function names.

### 2. Update the Administrator Edge Function

Open **Supabase → Edge Functions → findat-admin-users** and replace `index.ts` with:

`findat-admin-users-consultant-promotion-only.ts`

Keep **Verify JWT enabled**, then deploy the function.

This enforces the rule that:

- Administrators create Client and Consultant accounts directly.
- Only an existing Consultant can be promoted to Administrator.
- A Client cannot be promoted to Administrator.

The same source is included at:

`supabase/functions/findat-admin-users/index.ts`

### 3. Deploy the website

Extract the complete ZIP and deploy all files to Netlify, replacing the current deployment. Then perform a hard refresh:

`Ctrl + Shift + R`

On a phone, close and reopen the site once.

## Course access and payments

Administrators can mark a course as free or paid, select ZMW, USD, or GBP, set a price, and choose an access period from 1 to 36 months.

- Free published courses are available publicly.
- A paid course remains locked until an active enrolment exists.
- A learner requests access from the course card.
- The request appears in the Administrator Course Manager.
- After confirming that payment was received, the Administrator records the payment reference and activates access.
- Payment, access, completion, and certificate records appear under **My Learning**.
- Course videos, lesson documents, thumbnails, and paid-course assets use the private `findat-course-media` bucket. Published course-card images remain visible in the catalogue, while lesson media requires free-course, paid-enrolment, or Administrator access.

This package includes a controlled manual payment-confirmation workflow. It does not include a third-party card or mobile-money payment gateway. A gateway must be connected separately before payments can be collected automatically online.

## x1 | ProATR training

Administrators can open **x1 Training Studio** and add:

- training instructions and expected responses;
- tags and controlled knowledge;
- TXT, CSV, JSON, PDF, DOCX, XLS, and XLSX documents;
- Python validation or transformation code;
- test prompts and output checks.

Active training entries feed the x1 retrieval and response layer in Developments. This is controlled knowledge/RAG training and Python validation; it does not change the underlying language model weights.

## Monthly FINDAT Cloud access

- The existing Cloud loader and wallpaper remain unchanged.
- The Cloud sign-in gate appears only after the loader finishes.
- Administrators enter automatically.
- Clients and Consultants use their existing FINDAT username plus a generated monthly Cloud password.
- The Administrator generates or renews the password from **User Accounts → Monthly FINDAT Cloud access**.
- The password expires at the end of the current calendar month.
- Only the password hash is stored in Postgres.
- The user receives the temporary password in the notification bell and can open the notification in a popup and copy it.
- Administrators can cancel/suspend or reactivate Cloud access.

## Main verification checklist

1. Confirm the landing page no longer displays the Google `G` shortcut or profile-circle shortcut.
2. Open Recordings and confirm `Data-Thumbnail.jpg` appears on the Data Analytics Foundations card and before the built-in video plays.
3. Confirm Statistical Charts & Tables and Python Studio begin closed and toggle between Open and Close.
4. Assign a pending article to a Consultant and confirm it leaves the Administrator queue and appears in the Consultant queue.
5. Search and filter the Account Registry.
6. Confirm only a Consultant row displays **Make Administrator**.
7. Create one free and one paid test course.
8. Request the paid course as a learner, confirm the payment as Administrator, and check My Learning.
9. Add one active x1 training entry and test it in Developments.
10. Generate a Cloud password for a Client or Consultant, open the notification, then use it after the Cloud loader.

## Security notes

- Do not place service-role or secret keys in Netlify files or browser JavaScript.
- Cloud passwords are returned only at generation time and in the intended user notification; the database stores a hash.
- Run the SQL migration only in the intended FINDAT Supabase project.
