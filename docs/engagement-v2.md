# Engagement update

The second editing task is no longer a prerequisite to seeing the incident. A station name creates an initial ident; customization remains available. The first substantive activity is selecting and freezing a camera moment, followed by native Unlayer editing.

The initial call arrives after five seconds on air. After resolving it, a fixer threatens the feed. The warning dialog supports keyboard focus, dismissal and reopening without losing state. Airing the warning changes the on-air image; protecting the source retains the current image. Both choices remain in the episode history, and recutting resets both decisions while keeping the original user edit.

A closing composition shows the original getaway scene, the station name and the latest saved user plate. It is not a canned substitute for the user’s artwork. Camera motion and replay movement are image animation, not claimed video footage. Reduced-motion disables these effects and automatic source switching. The user can pause the camera sequence independently.

The editor now checks Unlayer's own `hasChanges()` state after Save and refuses an untouched frame. This closes the only path that allowed the central creative action to be skipped. The closing screen adds a 1600 × 1200 episode card containing the exact saved plate, callsign, choices and final frame; the raw saved frame remains available separately.

Audio now uses the licensed 135 BPM “Chase Pulse” recording described in `music-license.md`. One looping player fades between scenes, muting while loading invalidates the pending request, and same-origin tab coordination prevents overlapping playback. Music is user-enabled and off by default.

Validation on 14 September 2026: six state tests cover image propagation, branch changes, correction history, warning choices, recut and duplicate actions. Lint, type and production builds pass. Browser acceptance covered untouched-Save rejection, a real Text edit, preview, live broadcast, caller, fixer branch, ending, replay path, desktop and 390 × 844 presentation, and the generated PNG card. Music-device listening remains a subjective acceptance item.
