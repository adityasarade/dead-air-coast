# Status — Dead Air

**State:** Shipped and verified, including the final 20 September clarity and editor-rail pass.

The public source and canonical URL carry the final build. The historical verification below refers to the 17 September pass; the final changes were checked again on 20 September.

The canonical URL is **https://dead-air-coast.vercel.app**. The project's earlier generated hostname still resolves to the same deployment.

## Final pass — 20 September 2026 (IST)

- The camera feed now states the simple mission: the auction's golden fish is gone, and the visitor chooses whether the city sees the getaway or the handoff.
- The image desk offers one concrete first move. Its narrow rail uses **HEADLINE** and **BOXES** in place of clipped tool labels, and the replay action says **RESTART REPLAY** while already replaying.
- `npm test` passes all 31 tests, `npm run lint` passes, and `npm run build:vercel` passes. The rebuilt editor and phone-width presentation were visually checked in a real browser.

## Verified 17 September 2026 (IST)

- `npm run lint`, `npm test` (31 tests: 13 broadcast-reducer and attention, 11 editor-gate, 7 station-texture), `npm run build` (Vinext) and `npm run build:vercel` (the deploying Next build) all pass. `npx tsc --noEmit` is clean after `build:vercel`. Prettier is clean on every authored file.
- A full browser walk of the Next production build at 1280 × 720 and 390 × 844: boot (and skip), callsign, live feed, freeze-and-edit, a real draw stroke, the editor's own Save, Preview, TAKE LIVE, the caller, the fixer's warning, the sign-off, replay, the episode card download, and RUN ANOTHER NIGHT into the carried-over ident. Zero page errors, zero console errors, zero failed same-origin requests, no horizontal overflow at any stage at either width.
- The on-air monitor holds the visitor's exact saved `data:image/jpeg` URL, byte-identical to what Preview held; it is never a `/art/*` path.
- An untouched Save is still refused, and the refusal has five independent signals with a documented fail-open: an unreadable editor runtime lets the save through rather than blaming the visitor.
- Cold load to a usable editor, median of repeated Playwright runs against the local Next production build, before → after the interface pass: 3.09 s → **2.91 s** taking the skip, and 5.50 s → **3.39 s** waiting the terminal out. Throttled to 4 Mbps with 150 ms of latency: 4.84 s → **3.86 s** and 7.84 s → **5.64 s**. The remaining pre-editor time is the boot terminal itself plus the editor runtime's own `createEditor`; the CDN fetch that used to sit in front of it is gone from the critical path.
- All thirteen screenshots and the demo GIF were re-recorded from this build, because the interface pass changed every screen they show. The GIF is 18 s at 780 px, 7 fps, 2,704,050 B.

## The interface and world-building pass changed

- **Speed to the editor.** Unlayer's hosted runtime is pre-injected (its own documented embed URL, behind a `preconnect`) the moment the visitor selects BOOT THE STATION, so the slowest request in the journey overlaps the boot terminal and the callsign field. The terminal runs at 240 ms a line instead of 550 ms, holds 320 ms instead of 800 ms, and its exit is a coral primary button plus Enter and Esc instead of a quiet link.
- **The control desk.** Preview and programme are now identical 16:9 monitors side by side with the camera rack as a third column; the visitor's saved plate used to sit letterboxed in a 30 %-wide 4:3 panel beside a full-size monitor showing the auto-composed ident. The preview bus lights coral while it holds an unaired cut, and the channel bug no longer doubles the callsign over the ident that already carries it.
- **Canvas typography.** The ident, the closing shot and the episode card all asked for `Impact`, which does not exist on Linux or Android, and squashed long callsigns through `fillText`'s `maxWidth`. They now share `lib/canvas-type.ts`: predictable stacks, shrink-to-fit measurement, registration marks, scanlines. The ident is a composed slate; the closing shot is a graded band with a framed plate inset. CSS gained a `--display` stack for the same reason.
- **GTA VI legibility.** Ten original satirical Marlin Key ad spots (`lib/sponsors.ts`) running over the live feed, at the desk, on the closing frame and on the episode card; and EYES ON CH 08, a five-segment attention meter that climbs while you are on air and decides when the fixer's warning arrives. Both are declared fiction on screen and in the README.
- **States.** Editor runtime and image failures each get their own recovery card inside the frame that failed, with a direct retry. The boot watchdog distinguishes a failure from a slow decode. A measured notice appears when the editor's own canvas collapses at phone width.
- **Defects fixed on the way:** the episode card printed "EPISODE 01" on every night, including nights reached through RUN ANOTHER NIGHT; the ending screen pushed its own actions below the fold at 720 px; and the closing composite's sign-off printed through the HTML caption floated over it.
- **Defect mitigated, not fixed:** at 390 px the hosted editor's tool panel plus tool rail are wider than the frame, so opening MARK UP leaves its canvas about 30 px wide. The layout is the editor runtime's and is not restylable from outside. Dead Air gives the frame the full width of the handset, measures the canvas, and pins a notice explaining that landscape restores it (318 px portrait closed, 30 px portrait open, 431 px landscape open).

## The earlier reformatting pass changed

- **Presentation:** every authored source file reformatted from its hand-minified state (`app/page.tsx` 63 → ~1,190 lines; `app/globals.css` 19 → ~1,880 lines), with the stylesheet reordered so each breakpoint appears once. CSS cascade equivalence was verified programmatically across all eight satisfiable media-condition combinations.
- **Repository:** 117 tracked files reduced to 59. Removed 56 unused shadcn components, `examples/`, `db/`, `drizzle/`, a ChatGPT OAuth helper, a dead Unlayer Elements sheet, two unused Python audio renderers, and 18 unused dependencies.
- **Delivery:** eight WebP display derivatives replaced 12.5 MB of PNG on display surfaces (−92.7%). The landing transfers 169 KB of artwork and the boot sequence 420 KB, where it previously blocked on 4.98 MB. The canonical PNGs are retained and are still the only images handed to the editor.
- **Correctness:** fixed three silent data-loss paths (thumbnail clicks consuming the caller scene, an unaired revision being dropped from the episode card, a recut discarding the newest plate), a potential white-screen crash in replay, a frozen on-air clock, two React purity violations, a dismissible interruption dialog that never returned, and a hydration race that stopped image error handlers from ever firing.
- **Experience:** the callsign field no longer ships with a personal name pre-filled, RUN ANOTHER NIGHT makes the branches reachable without a reload, the camera desk is on the main path, and switching angle now routes through the editor so what airs is always the visitor's own cut.
- **Docs:** README gained a judge route, a three-capture propagation strip, the GTA VI framing and non-affiliation statement, a loop diagram, a screenshot table and a Known limits section. Three contradictory music documents were reduced to one accurate licence file. The unverified WebMCP block was removed rather than shipped.

**External boundary:** the upstream repository is already starred. The entrant must still submit the official form for this entry; no implementation can guarantee a subjective judging result.

## Confirmed against the live production build

- The callsign field opens empty with the CTA disabled, so no personal name ships.
- The editor rail reads GRADE / REFRAME / MARK UP / HEADLINE / BOXES / BUGS / BORDER through the wrapper's supported `translations` option.
- A real draw stroke saved through the editor's own Save arrives on the on-air monitor as a `data:image/jpeg` URL — the exact export, not a re-render.
- The desk stage carries a heading, the interruption dialog survives Escape while pending, and RUN ANOTHER NIGHT is reachable from the ending.
- Landing transfer measured at **0.37 MB over 10 requests**, down from 2.45 MB.
- Zero page errors and zero console errors across the full journey.

**Next gate:** submit the official form before **24 September 2026 at 23:59 UTC (25 September, 05:29 IST)**. Draft answers are in `docs/submission-kit.md`.
