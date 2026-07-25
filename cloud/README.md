# FINDAT Cloud — Shared Workspace Edition

FINDAT Cloud retains its workstation desktop, applications, virtual drive, Office tools, profile, fullscreen control and taskbar clock/calendar.

## Shared storage mode

When the complete package is run with the bundled root `server.js`, Cloud data is retained on the server and synchronised across devices using the same workspace URL. The browser also maintains a local IndexedDB mirror and an offline queue.

When `cloud/index.html` is opened from an ordinary static host without the API, FINDAT Cloud automatically falls back to local browser storage.

## Desktop arrangement

The FINDAT Cloud, Applications and Trash desktop features remain arranged in the fixed, evenly spaced left-hand column requested for Work Station No.1. Existing scattered positions are normalised.

## Fullscreen

A desktop/monitor button appears after the **+** workstation button. It enters or leaves fullscreen without reloading the desktop.

## Paste from your computer

Copy files, folders, images or text, select the FINDAT Cloud desktop or an open folder, and press **Ctrl+V**. Pasting inside an editor remains normal text editing.
