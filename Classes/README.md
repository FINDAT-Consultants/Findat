# Course media

Place the original course recording in this folder using this exact filename:

- `Data.MP4`

The public build blocks ordinary download controls, right-click saving, dragging, direct media links, Picture-in-Picture and remote playback. The video path is assigned at runtime from the protected JavaScript payload. The thumbnail is stored as an encrypted `.fdx` payload and rendered through a temporary in-memory Blob URL.

Important: GitHub Pages is public static hosting. A skilled user can still recover any media delivered to the browser through developer tools, browser cache, memory or screen recording. Stronger enforcement requires authenticated private storage, expiring signed URLs and DRM-capable streaming.

Large MP4 files may exceed GitHub's normal file-size limit.
