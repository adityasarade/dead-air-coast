# Dead Air competition audit

Audit date: 14 September 2026

Dead Air interprets the challenge as an authored pirate-TV side mission rather than a poster or character generator. A visitor names a station, freezes an original camera plate, makes a required visible edit in React Image Editor, takes it live, reacts to a caller and a threat, then receives a replay and downloadable episode artifact built from the exact saved pixels.

## Competitive position

- **Role clarity:** “Your Coast. Your Cut.” plus the production-chair opening explains the fantasy immediately.
- **Editor centrality:** an untouched Save is rejected through the editor instance's `hasChanges()` state. The returned `dataUrl` becomes the preview, live feed, recorded cuts, replay, raw download, and episode card.
- **Consequence:** two timed interruptions and multiple editorial choices alter the recorded sequence and final copy.
- **Originality:** the pirate-broadcast mechanic, station identity, five coastal scenes, writing, and visual system are project-original; no franchise media is used.
- **Payoff:** the visitor leaves with a 1600 × 1200 episode card containing their exact plate, station name, branch result, and closing frame.
- **Experience polish:** reduced motion, pauseable camera switching, optional licensed music, captions, keyboard-aware dialog behavior, and responsive layouts are included.

## Independent risk audit

The September competitor sample is crowded with wanted posters, character cards, evidence boards, and dossier exports. Dead Air's strongest advantage is temporal authorship: the user does not merely style a picture, but decides what a fictional city sees during a live incident. The previous release's largest risk was that the editor could be skipped with an untouched Save; that path is now closed. The prior production-sheet payoff was also less emotionally legible than the story itself; it has been replaced by an episode card tied directly to the user's outcome.

Remaining risks are external or subjective: judges may use a muted device, the hosted editor runtime requires network access, and no design can guarantee a prize. The build deliberately keeps music optional and communicates the core loop without relying on sound.

## Verification record

- `npm run lint`
- `npx tsc --noEmit`
- `node --test tests/broadcast.test.mjs` — six passing tests
- Sites production build
- Browser run at desktop and 390 × 844
- Untouched-Save rejection and real-edit Save
- PNG episode-card generation and native-size visual inspection

The final account-holder checklist is in `docs/submission-kit.md`.
