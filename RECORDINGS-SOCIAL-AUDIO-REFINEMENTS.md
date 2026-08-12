# FINDAT Recordings, Social Network and Publication Audio Refinements

This package preserves the existing FINDAT, Supabase and x1 implementation and changes only the requested interface areas.

## Included changes

- The recording poster places **Ready to begin** on the lower-left, with the play control and **Start session** directly beneath it.
- The sticky **Feed / My work / Saved / Network** navigation includes a translucent glass-blur bridge that conceals content moving behind the split while scrolling.
- **Ask x1** uses the original x1 development logo, matches the size of the other composer actions and remains in the same horizontal action row.
- The x1 publication-agent window now includes a **Clear** button beside **Send**. Clearing also prevents a response already in progress from reappearing.
- Private messages include a **Clear chat** button. It hides the previous conversation from the current account on that device while allowing new messages to continue.
- The full **Network** view has a dedicated search field and search-icon button, shows four profiles per page and provides numbered previous/next pagination.
- The right-rail **People in FINDAT** card remains limited to two profiles with the existing **See all** control.
- Published Article and Research labels now have a small read-aloud button.
- The publication reader includes play/pause, stop, animated sound-wave and volume controls.
- The reader selects the browser's best available natural English voice and applies a slower, lower-pitched delivery. Actual voice quality depends on voices installed by the browser or operating system.

## Deployment

No Supabase SQL or Edge Function changes are required for this update.

Replace the existing website repository files with the files in this package and deploy the static site normally.
