# Dead Air · Your Coast, Your Cut

An original coastal pirate-TV experience built around Unlayer React Image Editor. Name your station, create its ident, edit a camera still, take your exact saved image live, handle a caller and recut your broadcast.

## Current experience

- Three original coastal illustrations, with HTML controls separate from the artwork.
- Native Unlayer editing for the station ident and broadcast plate.
- Preview and on-air views hold the actual Save output.
- Take the caller, hold your image or switch the angle. Revise the plate and retain both versions.
- Replay the recorded image/decision sequence or recut from the interruption.
- Download a frame or a production sheet rendered with Unlayer React Elements.
- Original synchronized music stems, off by default; percussion enters on air and music ducks during a call.

This release uses illustrated stills, not generated video footage. Replay preserves sequence rather than real elapsed timing. Calls are captioned fiction, not live calls or recorded voice actors. There is no actual broadcast or simulated audience metric.

## Run

Use Node 22.13+ and `npm ci`, then `npm run dev`. No API keys or account setup. The hosted Unlayer runtime requires internet access.

`npm run build` builds the app. `npx tsc --noEmit` checks types. On Node 25+, `node --test tests/broadcast.test.mjs` checks exact saved-image propagation, branch differences, correction history and recut restoration.

The app keeps the current session in memory. Refresh starts a new night. Returning to the image desk opens the previous flattened saved bitmap; editable layer history does not persist between mounts.

## Architecture

`app/page.tsx` owns the visible stages and native Save callback. `lib/broadcast.ts` holds deterministic state transitions and the cut history. `lib/audio.ts` schedules synchronized audio buffers and scene-dependent volume. `lib/sheet.tsx` renders a production sheet using React Elements.

Optional WebMCP tools read broadcast state and start an already completed replay. They are feature-detected. A supported validation context was unavailable in this implementation pass; WebMCP is not runtime-verified.

## Assets and validation boundary

See [art provenance](docs/art-provenance.md) and [music provenance](docs/music-provenance.md). No artwork from Saltline, Second Take or external entries is used. No Rockstar assets, franchise characters, trailer footage or samples. Lucide icons retain the included license.

Build/type checks and four reducer tests are the automated validation scope. Native editor interaction, mobile layout, downloads and music listening need an end-to-end acceptance pass before competition submission. No claim of submission readiness is made by the private preview.
