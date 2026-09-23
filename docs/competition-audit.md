# Dead Air competition audit

## Final experience pass — 23 September 2026

- Kept the opening artwork unobstructed; automatic guidance now appears at first-use camera, editor, preview and caller controls. Manual Guide remains available after Stop tips, and Escape closes it.
- Rewrote the invitation around the waterfront incident, the visitor's role and the five-minute commitment. Added chapter progress in the station header.
- Corrected the phone hero's source sizing and composition so the portrait crop uses the sharper artwork and keeps the operator in frame.
- Promoted the 1600 × 1200 broadcast dossier as the ending's primary action, with the replay and exact-frame download alongside it.
- Restored accessible names for the native editor's icon-only Save and Cancel controls on phones.
- Found and fixed sentence truncation in the downloaded dossier. Multiline text now shrinks to fit while preserving all words; every authored ending and decision summary has regression coverage.
- Verification: 33 unit tests, ESLint, TypeScript and the Vercel production build pass. Browser journeys exercise an untouched Save, a real filter edit, exact-image propagation, the caller and fixer, and a correctly sized PNG dossier. Landing widths of 320, 390 and 1440 pixels have no horizontal overflow.

These changes target the published visual-execution and experience criteria while preserving the editor as the only route to the player's authored broadcast.

Audit date: 14 September 2026

Dead Air interprets the challenge as an authored pirate-TV side mission rather than a poster or character generator. A visitor names a station, freezes an original camera plate, makes a required visible edit in React Image Editor, takes it live, reacts to a caller and a threat, then receives a replay and downloadable episode artifact built from the exact saved pixels.

## Competitive position

- **Role clarity:** “Your Coast. Your Cut.” plus the production-chair opening explains the fantasy immediately.
- **Editor centrality:** an untouched Save is rejected through the editor instance's `hasChanges()` state. The returned `dataUrl` becomes the preview, live feed, recorded cuts, replay, raw download, and broadcast dossier.
- **Consequence:** two timed interruptions and multiple editorial choices alter the recorded sequence and final copy.
- **Originality:** the pirate-broadcast mechanic, station identity, five coastal scenes, writing, and visual system are project-original; no franchise media is used.
- **Payoff:** the final screen exposes every cut plus a three-beat picture/line/warning ledger, and the visitor leaves with a 1600 × 1200 broadcast dossier containing their exact plate, recorded frame log, station name, all branch results, and sponsor credit.
- **Experience polish:** reduced motion, pauseable camera switching, optional licensed music, captions, keyboard-aware dialog behavior, and responsive layouts are included.

## Independent risk audit

The September competitor sample is crowded with wanted posters, character cards, evidence boards, social feeds and dossier exports. Dead Air's strongest advantage is temporal authorship: the user does not merely style a picture, but decides what a fictional city sees during a live incident. The editor cannot be skipped with an untouched Save. The final act now makes that authorship legible instead of burying it: every recorded cut is directly browsable, all three decisions are recapped, and the downloadable dossier preserves the actual frame sequence.

Remaining risks are external or subjective: judges may use a muted device, the hosted editor runtime requires network access, and no design can guarantee a prize. The build deliberately keeps music optional and communicates the core loop without relying on sound.

## Verification record

- `npm run lint`
- `npx tsc --noEmit`
- `node --test tests/broadcast.test.mjs` — six passing tests
- Sites production build
- Browser run at desktop and 390 × 844
- Untouched-Save rejection and real-edit Save
- PNG broadcast-dossier generation and native-size visual inspection

The final account-holder checklist is in `docs/submission-kit.md`.
