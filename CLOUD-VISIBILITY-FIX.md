# Cloud file visibility fix

This build corrects cases where uploaded files appeared to disappear.

- The drop overlay shows the exact destination folder.
- Dropping on the **FINDAT Cloud** icon saves to the cloud root.
- Dropping on the desktop background saves to `/Desktop`.
- After every successful upload, the GitHub tree is force-refreshed.
- The destination folder opens when needed and the uploaded files are highlighted.
- A token entered in Settings survives a reload in the same browser tab session. Document bytes are still not stored in the browser.
- Asset cache-busting and no-cache headers prevent an older Cloud System script from remaining active after deployment.

Existing files from the previous build may already be in the repository under `findat-cloud/Desktop`. The new build will display them after connecting and refreshing.
