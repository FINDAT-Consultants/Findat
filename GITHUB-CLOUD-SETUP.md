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

Create a fine-grained personal access token that is limited to the storage repository and grants repository **Contents: Read and write** permission. Enter it inside **Settings → FINDAT Cloud**. The app holds it only for the current open page.

Users who only need to read a public repository can connect without a token. Private repositories require a token for reading as well.

## Device access

Every device must use the same owner, repository, branch, and root folder. Write-capable devices also enter a token for their current session. Files are committed directly to the repository and can be downloaded through FINDAT Cloud or viewed in GitHub.
