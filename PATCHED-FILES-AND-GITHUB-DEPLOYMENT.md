# Patched files and GitHub deployment

## Files patched for this repair

### Public website files — commit and deploy to GitHub

- `index.html`
- `assets/data/样式8.fdx`
- `assets/data/逻辑9.fdx`
- `integration-source/styles.integrated.css`
- `integration-source/app.integrated.js`
- `build-manifest.json`
- `README.md`

### Supabase database files — commit to GitHub and run in Supabase

- `FINDAT-SOCIAL-PUBLISHING-RESPONSIVE-FIX.sql`
- `FINDAT-SOCIAL-PUBLISHING-RESPONSIVE-VERIFY.sql`
- `supabase/migrations/20260803210000_findat_social_publishing_responsive_fix.sql`

### Deployment documentation — commit to GitHub

- `SOCIAL-PUBLISHING-RESPONSIVE-FIX-DEPLOYMENT.md`
- `PATCHED-FILES-AND-GITHUB-DEPLOYMENT.md`

## Important deployment distinction

Committing the SQL files to GitHub does not automatically change an already-running Supabase database unless your deployment pipeline executes migrations. Run `FINDAT-SOCIAL-PUBLISHING-RESPONSIVE-FIX.sql` in the Supabase SQL Editor, or push the new migration through the Supabase CLI.

The live public site loads the protected `.fdx` files. Deploying only `integration-source/app.integrated.js` and `integration-source/styles.integrated.css` will not update the website.
