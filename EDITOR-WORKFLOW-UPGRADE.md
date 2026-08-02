# FINDAT Editor Workflow Upgrade

## Included

- Login, registration and recovery inputs clear automatically after a valid submission is started.
- Article editor inputs clear after a successful save, editorial update, approval submission or Administrator publication.
- Administrators publish directly from the Writing Desk instead of sending their own work for approval.
- Review & Approval includes Review, Edit, Approve, Return and Delete controls.
- Administrators can delete published articles.
- Clients and Consultants can upload cover photographs.
- The article editor includes CSV/TSV table, statistical summary and bar/line/pie chart generation.
- Writing status icons were refreshed.
- The workspace brand now reads CONSULTANTS.

## Required live database update

Run `FINDAT-EDITOR-WORKFLOW-UPGRADE.sql` once in the Supabase SQL Editor. It updates the article trigger so Client cover photos are accepted by Postgres.

No new Edge Function is required.
