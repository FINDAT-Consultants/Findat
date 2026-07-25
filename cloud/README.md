# FINDAT Cloud — GitHub Cloud Edition

FINDAT Cloud stores dropped, pasted, created, renamed, moved, and deleted documents in a GitHub repository instead of IndexedDB or other browser file storage.

## What is stored where

- **Documents and folders:** the configured GitHub repository, branch, and storage folder.
- **GitHub token:** current browser-tab session only. It survives a page reload in the same tab, but is not written to localStorage, source files, GitHub, or document storage.
- **Repository address and interface preferences:** may be remembered in localStorage so the same browser can reconnect easily.
- **Document bytes:** are not saved in localStorage or IndexedDB by this build.

## First setup

1. Create a GitHub repository. A private repository is recommended for non-public documents.
2. Give the repository an initial commit, such as a README file.
3. Open **Settings → FINDAT Cloud**.
4. Enter the repository owner, repository name, branch, and storage folder.
5. For uploads and changes, enter a fine-grained GitHub personal access token restricted to that repository with **Contents: Read and write** permission.
6. Select **Connect and sync**.

You may set common defaults for every deployed copy in `github-config.js`. Never place a token in that file.

## Multiple devices

Use the same owner, repository, branch, and storage folder on every device. Each device can then list and download the same files. A write token must be entered separately on each device that needs to upload, rename, move, or delete files. In the same browser tab it is restored after a reload and is cleared when the tab session ends or GitHub is disconnected.

The workspace refreshes from GitHub approximately once per minute while visible. Use **Refresh from GitHub** for an immediate refresh.

## Upload and download

- Drop files onto the desktop, Finder area, the FINDAT Cloud icon, or a folder to upload them to GitHub. The destination is shown on the drop overlay.
- Use **Upload Files** to select files normally. After GitHub confirms the upload, the destination folder refreshes automatically, opens when necessary, and highlights the new files.
- Copy files, folders, images, or text on the computer and press **Ctrl+V** in FINDAT Cloud.
- Choose **Download** from a file menu or the preview window to copy a cloud file to the local computer.
- In supported desktop browsers, press or click a file briefly to prepare it, then drag it from Finder onto the computer desktop. If preparation is still running, drag it again or use Download.

## Limits and security

- This browser build limits each upload to **50 MB** for reliable Base64 API transfers.
- GitHub's repository contents API does not support files larger than 100 MB.
- A public repository makes uploaded documents public. Use a private repository for private material.
- A browser-only token is visible to anyone who can inspect or control that browser session. Use a narrowly scoped, expiring, fine-grained token and revoke it when no longer needed.
- GitHub is suitable for a simple shared document workspace, but it is not a replacement for high-volume object storage or a transactional database.

## Fullscreen

Use the monitor button after the **+** workstation button to enter or leave fullscreen. All cloud and workstation features continue working in either mode.
