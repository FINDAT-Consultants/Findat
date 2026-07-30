# FINDAT Commerce, x1 Training and Cloud Access Deployment

This build extends the maintained `FINDAT-Supabase-Google-Authentication(1).zip` baseline.

## Included changes

- Landing-page Google shortcut button and generic human-profile circle removed. Google authentication remains available inside the sign-in and registration dialogs.
- `Classes/Data-Thumbnail.jpg` is the Data Analytics Foundations card image and the poster for **How Data Analytics Work per Domain**.
- Statistical Charts & Tables and Python Studio open independently and change their labels from **Open** to **Close**.
- Assigned Consultant-publisher articles leave the Administrator's unassigned Review & Approval queue and appear only in the assigned Consultant's queue.
- Successful profile, account, article, course, lesson and payment submissions clear or close their active forms.
- New Administrators are made only by promoting existing Consultant accounts. Client accounts cannot be promoted.
- Account Registry includes search, role filter, status/Cloud-access filter and sorting.
- Courses support Free/Paid access, ZMW/USD/GBP prices and a minimum one-month access period.
- Learners receive payment history, enrolment history, completion records and certificate numbers.
- x1 | ProATR Training Lab supports Admin-created projects, assigned Consultants, private training-document uploads, queued experiments and evaluation cases.
- FINDAT Cloud has a macOS Sequoia-inspired access screen. Administrators use their normal FINDAT password. Other users use a monthly system-generated Cloud password delivered through the notification bell.

## Important x1 scope

The Training Lab is a secure **model-operations and orchestration layer**. It stores datasets, assignments, jobs and evaluations. A static Netlify website and Postgres database cannot independently fine-tune or train a ChatGPT-class foundation model. Actual deep-learning or fine-tuning jobs require an authorised external model provider or a dedicated GPU/ML worker connected to the queued jobs. No claim is made that a foundation model is trained merely by deploying this package.

## Course payment scope

This build records payment or receipt references and lets an Administrator approve or reject them. It does not process bank-card or mobile-money transactions by itself. A verified payment gateway or server-side payment integration is required for automatic payment confirmation.

## Deployment order

### 1. Run the database migration

Open **Supabase → SQL Editor → New query** and run:

`FINDAT-COMMERCE-X1-CLOUD-ACCESS-UPGRADE.sql`

This creates the course-commerce, learning-history, private x1-training and monthly Cloud-access records, policies and RPC functions.

### 2. Verify the database

Run:

`FINDAT-COMMERCE-X1-CLOUD-ACCESS-VERIFY.sql`

The table, column, RPC, bucket and Realtime checks should return `true`.

### 3. Update `findat-admin-users`

Deploy:

`supabase/functions/findat-admin-users/index.ts`

Dashboard alternative:

`supabase/dashboard-functions/findat-admin-users.ts`

Keep **Verify JWT: ON**.

This function manages Consultant/Client creation, Consultant-to-Administrator promotion, account filtering data, and monthly Cloud credentials.

### 4. Deploy `findat-cloud-login`

Deploy:

`supabase/functions/findat-cloud-login/index.ts`

Dashboard alternative:

`supabase/dashboard-functions/findat-cloud-login.ts`

Keep **Verify JWT: ON**.

### 5. Deploy the website

Extract the ZIP and replace the current Netlify deployment. Then hard-refresh with **Ctrl + Shift + R**. On mobile, close and reopen the site once.

## Cloud password workflow

1. Administrator opens **User Accounts**.
2. Find an active Client or Consultant.
3. Click **Generate Cloud password** or **Renew Cloud password**.
4. The generated password expires at 23:59:59 UTC on the last day of the current month.
5. The user receives a bell notification containing the username, password and expiry date.
6. The Administrator can suspend the password at any time.
7. Administrator Cloud access uses the Administrator's normal FINDAT password.

The Cloud lock screen is an application access gate. The migration also changes ordinary Cloud Storage writes to require an authenticated session. Public course thumbnails and approved public media remain readable where required by the website.

## x1 training workflow

1. Administrator creates a training project.
2. Administrator assigns selected Consultants.
3. Assigned users upload documents to the private `findat-x1-training` bucket.
4. Assigned users prepare evaluation cases and queue jobs.
5. A connected training worker or model provider must claim queued jobs, perform the compute, and write status/metrics back to `findat_x1_training_jobs` and model versions.

## Validation performed

The package was checked for JavaScript syntax, TypeScript transpilation syntax, duplicate HTML IDs, encrypted-resource round trips, expected image embedding and ZIP integrity. It was not deployed to the live Supabase or Netlify project from this environment.
