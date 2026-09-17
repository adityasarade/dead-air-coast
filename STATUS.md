# Status — Dead Air

**State:** Build and documentation are complete in the working tree. Public source and deployment need to be refreshed from it.

## Verified 17 September 2026 (IST)

- `npm run lint`, `npm test` (20 tests: 9 broadcast-reducer, 11 editor-gate), `npm run build` (Vinext) and `npm run build:vercel` (the deploying Next build) all pass. `npx tsc --noEmit` is clean after `build:vercel`.
- A full browser walk of the Next production build at 1440 × 900 and 390 × 844: boot, callsign, live feed, freeze-and-edit, a real draw stroke, the editor's own Save, Preview, TAKE LIVE, the caller, the fixer's warning, the sign-off, replay, the episode card download, and RUN ANOTHER NIGHT. Zero page errors, zero console errors, no horizontal overflow at 390 px.
- An untouched Save is still refused, and the refusal now has five independent signals with a documented fail-open: an unreadable editor runtime lets the save through rather than blaming the visitor.
- Thirteen screenshots and a 19-second single-take GIF were captured from that build and are in the README.

## This pass changed

- **Presentation:** every authored source file reformatted from its hand-minified state (`app/page.tsx` 63 → ~1,190 lines; `app/globals.css` 19 → ~1,880 lines), with the stylesheet reordered so each breakpoint appears once. CSS cascade equivalence was verified programmatically across all eight satisfiable media-condition combinations.
- **Repository:** 117 tracked files reduced to 59. Removed 56 unused shadcn components, `examples/`, `db/`, `drizzle/`, a ChatGPT OAuth helper, a dead Unlayer Elements sheet, two unused Python audio renderers, and 18 unused dependencies.
- **Delivery:** eight WebP display derivatives replaced 12.5 MB of PNG on display surfaces (−92.7%). The landing transfers 169 KB of artwork and the boot sequence 420 KB, where it previously blocked on 4.98 MB. The canonical PNGs are retained and are still the only images handed to the editor.
- **Correctness:** fixed three silent data-loss paths (thumbnail clicks consuming the caller scene, an unaired revision being dropped from the episode card, a recut discarding the newest plate), a potential white-screen crash in replay, a frozen on-air clock, two React purity violations, a dismissible interruption dialog that never returned, and a hydration race that stopped image error handlers from ever firing.
- **Experience:** the callsign field no longer ships with a personal name pre-filled, RUN ANOTHER NIGHT makes the branches reachable without a reload, the camera desk is on the main path, and switching angle now routes through the editor so what airs is always the visitor's own cut.
- **Docs:** README gained a judge route, a three-capture propagation strip, the GTA VI framing and non-affiliation statement, a loop diagram, a screenshot table and a Known limits section. Three contradictory music documents were reduced to one accurate licence file. The unverified WebMCP block was removed rather than shipped.

**External boundary:** starring the upstream repository, publishing a social post, and submitting the official form require the entrant account. No implementation can guarantee a subjective judging result.

**Next gate:** commit and push this working tree, redeploy, confirm the live URL matches the source, then star the React Image Editor repository and submit the official form before **24 September 2026 at 23:59 UTC (25 September, 05:29 IST)**.
