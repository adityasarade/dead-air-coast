# Art provenance

All scene art was generated specifically for Dead Air using the built-in image tool. The approved visual concepts were the only references. Three clean standalone assets were produced: van opening, dock incident and pre-auction handoff. A targeted image edit corrected a spurious appendage at the tip of the golden fish's bill in the handoff view; `party-v2.png` is the used version. The original source and concept files are retained separately in the opportunity's visual-pass folder.

The station ident is composed locally from this original scene and the entered station name, then authored by the visitor in Unlayer. Saved images on air and in replay come directly from the editor callback. UI controls are HTML, not click areas over a concept screenshot.

The three composites Dead Air draws itself — the station ident, the closing sign-off and the downloadable episode card — set their type through `lib/canvas-type.ts`. They previously asked the canvas for `Impact`, which ships with Windows and macOS and is absent on Linux and Android; on those platforms the composite a visitor saved silently used an unrelated family. The shared stacks name a heavy cut of the system sans on every platform (Arial Black, then the platform's own black weight through `sans-serif`) and a real monospace, and every long string is measured and shrunk to fit rather than horizontally squashed by `fillText`'s `maxWidth`. The same reasoning applies to the interface: `--display` in `app/globals.css` is the CSS counterpart, with condensed fallbacks for the station marks and bugs.

## Written world content

All in-world writing is original to Dead Air. That includes the ten satirical Marlin Key ad spots in `lib/sponsors.ts` — the business names, the one-line spots, and the small print. Each business name was searched as a real trading name before it shipped; three earlier drafts were rewritten because the search returned live companies too close to them ("Cormorant Self-Storage", "Blue Ledger Accounting" and "The Tarpon Room"), and their replacements returned no match. `tests/station-texture.test.mjs` enforces the boundary mechanically: it fails on any franchise term, on a list of known real trade names including the three rejected drafts, and on a duplicated or empty field.

The EYES ON CH 08 attention estimate is authored fiction, not telemetry. It is generated locally from a timer, is labelled _STATION ESTIMATE / NOT A REAL AUDIENCE_ wherever it appears, makes no network request, and stores nothing.

All characters, setting and incident are original fiction. The coastal-crime mood is inspired by the requested GTA reference; there are no GTA logos, Rockstar art or named franchise characters. No previous competition project's artwork or competitor imagery was used.

Lucide supplies interface icons and favicon under its bundled license in `docs/LUCIDE-LICENSE.txt`.

## Engagement update

Two additional original scenes were generated with the established Dead Air images as references: a linen-suited security fixer at the van, and a nighttime van/mascot getaway at the marina. Both were inspected for visual continuity. No third-party artwork was used. The closing frame combines the getaway artwork with the visitor’s latest edited plate and station label.

## Display derivatives

Dead Air preserves each original 1672 × 941 PNG as the untouched same-origin source handed to
Unlayer React Image Editor. Display-only surfaces use measured WebP derivatives, so browsing the
broadcast stays light without reducing editable plate quality.

The following display-only files were resized and WebP-encoded from the corresponding canonical
artwork on 17 September 2026 with `cwebp` 1.6.0, quality 84, method 6:

```sh
cwebp -q 84 -m 6 -resize <width> 0 public/art/<name>.png \
  -o public/art/display/<name>-<width>.webp
```

| Asset                                   | Source         | Dimensions | Encoded size | Runtime role                                                                           |
| --------------------------------------- | -------------- | ---------: | -----------: | -------------------------------------------------------------------------------------- |
| `public/art/display/opening-768.webp`   | `opening.png`  |  768 × 433 |     68,412 B | Small responsive source for the landing hero.                                          |
| `public/art/display/opening-1440.webp`  | `opening.png`  | 1440 × 811 |    168,738 B | Large responsive source for the landing hero, and the `.boot-surround` CSS background. |
| `public/art/display/dock-1440.webp`     | `dock.png`     | 1440 × 811 |    217,854 B | Watch-feed picture, source-choice card, and the boot-sequence preload.                 |
| `public/art/display/dock-320.webp`      | `dock.png`     |  320 × 181 |     23,166 B | Camera thumbnails in the watch and desk strips (74–120 px tall).                       |
| `public/art/display/party-v2-1440.webp` | `party-v2.png` | 1440 × 811 |    201,980 B | Watch feed, source-choice card, boot preload, and the `prepareIdent` canvas composite. |
| `public/art/display/party-v2-320.webp`  | `party-v2.png` |  320 × 181 |     22,138 B | Camera thumbnails in the watch and desk strips.                                        |
| `public/art/display/fixer-768.webp`     | `fixer.png`    |  768 × 433 |     78,890 B | Art panel of the pressure dialog.                                                      |
| `public/art/display/getaway-1440.webp`  | `getaway.png`  | 1440 × 811 |    245,790 B | Source for the closing 1280 × 720 canvas composite.                                    |

All eight derivatives total 1,026,968 B, which is 8.21% of the 12,502,946 B of canonical PNGs.

### The editor boundary

Derivatives are never supplied to Unlayer React Image Editor. `app/page.tsx` keeps two separate
maps for exactly this reason:

- `art` — the canonical PNGs. Every `openEditor(...)` call reads from here, and so does every
  value that can land in `Cut.onAir`, because the desk can re-open `cut.onAir` in the editor.
- `display` — the derivatives. On-screen surfaces only, plus the two canvas composites in
  `prepareIdent` and `finish`, which draw to a canvas and export a `data:` URL rather than
  handing their source to the editor.

The two composites and the episode card only ever downscale: `prepareIdent` and `finish` draw a
1440 px wide source into a 1280 × 720 canvas, and `lib/episode-card.ts` fits images into a
930 × 525 and a 398 × 224 box inside its 1600 × 1200 output. Measured against composites built
from the original PNGs, the derivative-based 1280 × 720 output scores 33.10 dB PSNR
(2.21% RMSE) for `prepareIdent` and 31.95 dB for `finish`.

## OG preview image

`public/og.png` is a 1200 × 630 social preview card composed from `opening.png` with ImageMagick:
the right 41% of the plate (the console and the monitor showing the auction) feathered into a
flat `#0b1319` panel carrying the "DEAD AIR" title and the "YOUR COAST. YOUR CUT." tagline in the
app's own Impact and monospace type. Encoded as an 8-bit palette PNG (247 colours, no dithering,
which keeps the flat panel at exactly `#0b1319`) at 182,474 B.

## Product documentation media

Captured on 17 September 2026 from the local Next production build (`npm run build:vercel`) driven with Playwright 1.62.1 / Chromium. Everything here is a real browser capture of the shipped application; nothing is a mockup, a composite, or a reconstruction.

| Asset                     | Origin                                                                                                  | License / use basis                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/screenshots/*.webp` | Captured at 1280 × 720 and 390 × 844, then encoded with `cwebp` 1.6.0 at quality 86, method 6           | Team-created product documentation | Thirteen judge-facing states: arrival, station uplink, callsign, live feed, the untouched plate in the editor, the same plate carrying a real draw stroke, the control room, on air, the caller, the fixer's warning, the closing shot, replay, and the phone layout.                                                                                                                                                         |
| `public/dead-air.gif`     | Recorded as video from one continuous run of that build, then encoded with `ffmpeg` and `gifsicle` 1.96 | Team-created product demonstration | 18 seconds at 780 px, 7 fps, 128-colour palette, 2,704,050 B. A single unbroken take: the frozen plate in React Image Editor, a coral ring traced round the mascot, the editor's own Save, the exact saved image appearing in PREVIEW / YOUR CUT, TAKE LIVE, and that same image on the on-air monitor. No cuts, no speed changes, no substituted frames; only the pre-roll before the editor opens is trimmed off the front. |

The three-capture propagation strip in the README (`05-editor-source`, `06-editor-marked`, `08-onair`) comes from that same run, so the stroke shown mid-edit is the stroke shown on air.

### Re-captured 17 September 2026

The interface pass rebalanced the control desk, recomposed the station ident and the closing
sign-off, rebuilt the boot terminal's exit control, and added the attention meter and the paid
programming — which changed every screen that appears in the media above. **All thirteen
screenshots and the GIF were therefore re-recorded from a fresh production build in one run**, so
nothing in this repository documents a screen that no longer exists. The intermediate PNGs kept
next to `05-editor-source`, `06-editor-marked` and `08-onair` are the unencoded sources of those
three WebP files from the same capture.
