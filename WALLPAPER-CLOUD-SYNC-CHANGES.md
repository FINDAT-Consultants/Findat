# FINDAT Built-in Wallpapers and Cloud Sync

- Added four photographic wallpapers under `cloud/assets/wallpapers/`:
  - Monterey Dark
  - Monterey Light
  - FINDAT Office Light
  - FINDAT Office Dark
- Monterey Dark is the new default wallpaper.
- Existing gradient wallpapers remain available.
- The Custom wallpaper control compresses the selected image and uploads it to:
  `findat-documents/findat-v1/settings/custom-wallpaper.jpg`.
- The selected wallpaper, fit mode and custom-image version are saved to:
  `findat-documents/findat-v1/settings/personalization.json`.
- FINDAT checks the cloud preference at startup, whenever the page becomes
  visible, and during the normal 15-second cloud refresh cycle.
- No additional SQL is required because the existing `findat-v1/%` Storage
  policies include the settings objects.

The current frontend uses a shared browser-safe Supabase key and a fixed ADMIN
account, so this wallpaper preference is shared by all devices connected to the
same FINDAT deployment. Per-user wallpaper isolation requires Supabase Auth and
owner-scoped Storage policies.
