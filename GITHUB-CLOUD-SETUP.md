# FINDAT GitHub Cloud Setup

## Recommended repository

Create a dedicated private GitHub repository, for example `findat-storage`, and initialise it with a README. Keeping storage separate from the website repository reduces accidental exposure and keeps file history clear.

## Shared defaults

Edit `cloud/github-config.js` before publishing:

```js
window.FINDAT_GITHUB_DEFAULTS = Object.freeze({
  owner: 'YOUR-GITHUB-NAME',
  repo: 'findat-storage',
  branch: 'main',
  root: 'findat-cloud'
});
```

Do not add a token to this file.

## Token

Create a fine-grained personal access token that is limited to the storage repository and grants repository **Contents: Read and write** permission. Enter it inside **Settings → FINDAT Cloud**. The app holds it only in the current browser-tab session. It survives a reload in that tab, but is cleared when the tab session ends or GitHub is disconnected.

Users who only need to read a public repository can connect without a token. Private repositories require a token for reading as well.

## Device access

Every device must use the same owner, repository, branch, and root folder. Write-capable devices also enter a token for their current session. Files are committed directly to the repository and can be downloaded through FINDAT Cloud or viewed in GitHub.


## Upload visibility

The drop overlay shows the exact destination folder. After GitHub confirms an upload, FINDAT Cloud forces a repository refresh, reveals the destination folder when needed, and highlights the uploaded files. Dropping directly on the FINDAT Cloud desktop icon saves to the cloud root; dropping on the desktop background saves to `/Desktop`.
