# Track-order video playback design

## Goal

Make the existing track-order header video play reliably across mobile and desktop browsers without restoring a poster image, changing the page layout, or changing unrelated styling.

## Scope

- Remove the deleted poster reference from the track-order page.
- Keep the background video configured with `autoPlay`, `muted`, `playsInline`, `loop`, and `preload="metadata"`.
- Safely request playback after the video mounts and retry after `loadedmetadata` and `canplay`.
- If a browser rejects autoplay, retain the video element and show a simple centered **Play video** button over the video area.
- When the user presses the button, request playback and hide the button after playback succeeds.
- Do not restore or generate a poster image.
- Do not show native video controls during normal playback. Native controls may be enabled only if a user-initiated playback attempt fails.
- Do not change the track-order page layout or any unrelated styling.

## Component behavior

`TrackOrder` will pass only the MP4 source to the existing `PageHeader` video API. `HeaderBackgroundVideo` will continue to own playback state and the video element.

The video element will remain mounted when autoplay is rejected so a user gesture can start the same media. A shared safe playback function will enforce muted inline playback, catch rejected promises, and distinguish automatic attempts from the manual fallback attempt. Automatic failures reveal the centered play button. A successful `playing` event clears the fallback state. If the manual attempt also fails, native controls become available as the last-resort playback path.

Repeated playback requests will be bounded so `loadedmetadata` and `canplay` do not create an unbounded retry loop.

## Failure handling

- Media loading errors leave the existing dark header background and do not alter page layout.
- Autoplay rejection reveals the manual play button instead of removing the video.
- Manual playback rejection enables native controls, satisfying the requirement that controls appear only after playback fails.
- Reduced-motion and data-saver preferences remain respected by the shared header video behavior.

## Verification

- Run the client ESLint task.
- Run the client production build.
- Review the final diff to confirm only the intended source/spec files and the user's already-deleted poster are involved.
- Report the exact files changed and distinguish pre-existing user changes from changes made for this task.
