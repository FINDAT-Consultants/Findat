# FINDAT — GitHub Repository Cloud Edition

Open `cloud/` for the FINDAT Cloud desktop application.

This edition keeps the full existing system and adds secure GitHub repository persistence for documents dropped onto the cloud desktop:

- immediate desktop icon;
- visible upload and commit progress;
- repository-backed shared manifest;
- public or private repository previews;
- synchronised rename, move, edit, Trash, restore, and deletion;
- local IndexedDB fallback.

Start with `github-backend/README.md`. The GitHub token belongs only in the backend environment and must never be added to browser files.
