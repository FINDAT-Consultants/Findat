# FINDAT x1 AI Training Lab deployment

## Purpose

This release adds a governed training workspace for the existing x1 Financial Assistant while preserving the Google Authentication baseline and its existing features. The lab uses the current browser-based x1 reasoning engine and Supabase Postgres. It does not call an external AI model API.

## Important capability boundary

x1 is a compact finance system made from deterministic financial calculations, rules, local evidence retrieval, a small browser intent classifier and approved examples. The Training Lab improves its approved knowledge and answer patterns. It does not create a foundation model comparable to ChatGPT and it is not conscious.

## Deployment

1. In Supabase, open **SQL Editor → New query**.
2. Run `FINDAT-X1-AI-TRAINING-LAB-UPGRADE.sql`.
3. Run `FINDAT-X1-AI-TRAINING-LAB-VERIFY.sql`.
4. Deploy every file in this package to Netlify, replacing the current site files.
5. Hard refresh with `Ctrl + Shift + R`.

## Administrator test

1. Sign in as Administrator.
2. Open **x1 AI Training** in the workspace sidebar.
3. Assign a task to an active Consultant.
4. Open Developments → x1 and run a prompt, transformation, reconciliation or workflow.
5. Return to **Inputs & outputs** and convert the captured run into a training example.
6. Submit, review and approve the example.
7. Run an evaluation.
8. Build and apply a training snapshot.

## Consultant test

1. Use a separate browser session and sign in as the assigned Consultant.
2. The **x1 AI Training** navigation item should be visible.
3. Start the assignment, create examples, submit work and provide review recommendations.

## Security

Row Level Security limits task administration and deployment to Administrators. Consultants see their assignments, their own captured runs, approved active examples and the training records linked to their assignments. Clients do not receive the Training Lab.
