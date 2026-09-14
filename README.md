# Dead Air · Your Coast, Your Cut

An original coastal pirate-TV experience built around Unlayer React Image Editor. Name your station, catch an animated camera sequence, freeze and edit a frame, go live, handle a caller and a warning at the van, then cut your getaway episode.

## Current experience

- A short, skippable mobile-uplink terminal prepares the camera images before callsign entry.
- Five original coastal illustrations, with HTML controls separate from the artwork.
- Native Unlayer editing for the broadcast plate, with optional station-ident customization. An untouched Save is rejected, so the editor is a required story action rather than a decorative stop.
- Preview and on-air views hold the actual Save output.
- Take the caller, hold your image or switch the angle. Then air the fixer’s warning or protect the source. These choices change the on-air image and recorded episode.
- Animated camera pans, a freeze-frame entry, hard-cut/dissolve choices, incoming notices and an accessible warning dialog. Reduced-motion settings disable auto camera cuts and animations.
- Replay the recorded image/decision sequence or recut from the interruption.
- Download the exact edited frame or a 1600 × 1200 episode card that combines the callsign, branch outcome, closing frame, and unchanged saved editor export.
- Licensed 135 BPM “Chase Pulse” by Kevin MacLeod replaces the procedural stems. Off by default, with smooth scene fades and one active music player across same-origin tabs.

This release animates illustrated stills, not generated video footage. Replay preserves sequence rather than real elapsed timing. Calls are captioned fiction, not live calls or recorded voice actors. There is no actual broadcast or simulated audience metric.

## Run

Use Node 22.13+ and `npm ci`, then `npm run dev`. No API keys or account setup. The hosted Unlayer runtime requires internet access.

`npm run build` builds the app. `npx tsc --noEmit` checks types. On Node 25+, `node --test tests/broadcast.test.mjs` checks exact saved-image propagation, branch differences, correction history and recut restoration.

The app keeps the current session in memory. Refresh starts a new night. Returning to the image desk opens the previous flattened saved bitmap; editable layer history does not persist between mounts.

## Architecture

`app/page.tsx` owns the visible stages and native Save callback. `lib/broadcast.ts` holds deterministic state transitions and the cut history. `lib/audio.ts` plays one licensed recording with conservative scene-dependent gain. `lib/episode-card.ts` renders the downloadable episode card with Canvas while preserving the exact saved bitmap.

Optional WebMCP tools read broadcast state and start an already completed replay. They are feature-detected. A supported validation context was unavailable in this implementation pass; WebMCP is not runtime-verified.

## Assets and validation boundary

See [art provenance](docs/art-provenance.md) and [current music provenance](docs/music-current-license.md). No artwork from Saltline, Second Take or external entries is used. No Rockstar assets, franchise characters, trailer footage or samples. Lucide icons retain the included license.

Build/type/lint checks and six reducer tests are the automated validation scope. On 14 September 2026, a browser acceptance pass also covered desktop and 390 × 844 layouts, the full editor-to-broadcast path, untouched-Save rejection, branching, replay, and both PNG downloads. The downloaded episode card was inspected at its native 1600 × 1200 size. Music remains optional and off by default; listening quality is necessarily device- and listener-dependent.
