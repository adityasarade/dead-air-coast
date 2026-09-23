/**
 * Canvas typography for the three composites Dead Air draws itself: the
 * station ident, the closing shot and the downloadable episode card.
 *
 * Why this is not just `"900 92px Impact"`:
 *
 *  - **Impact does not exist on Linux or Android.** It is a Microsoft core
 *    font, shipped by Windows and macOS only. On the two platforms without it
 *    the canvas silently fell back to the generic `sans-serif` at whatever
 *    weight, so the ident that a phone visitor saved looked nothing like the
 *    one in the screenshots. `DISPLAY_STACK` asks for a *heavy weight of the
 *    system sans* instead — Arial Black where it exists, then the platform's
 *    own black cut (Roboto Black on Android, DejaVu Sans Bold on Linux) via
 *    `sans-serif` at weight 900. Every platform lands on something dense.
 *  - **Canvas does not wrap or shrink text.** `fillText`'s `maxWidth`
 *    argument squashes glyphs horizontally instead, which is why a long
 *    callsign used to end up condensed to illegibility. `fitText` picks the
 *    largest size that actually fits and keeps the letterforms intact.
 */

/** Heavy display face. See the note above: deliberately not Impact. */
export const DISPLAY_STACK =
  '"Arial Black", "Arial Bold", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Interface mono, matching the app's own `monospace` UI type. */
export const MONO_STACK = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

export const displayFont = (size: number) => `900 ${size}px ${DISPLAY_STACK}`;
export const monoFont = (size: number, weight = 400) => `${weight} ${size}px ${MONO_STACK}`;

/** The measuring surface `fitText` needs: the 2D context's own subset. */
export type TextMeasurer = {
  font: string;
  measureText(text: string): { width: number };
};

/**
 * Largest whole-pixel display size at which `text` fits inside `maxWidth`,
 * searched down from `max` and never below `min`. The context's `font` is left
 * set to the chosen size, so callers can draw immediately.
 *
 * At `min` the text may still overflow — a 40-character callsign in an 18-px
 * box has no honest answer — so callers that can overflow their box pass a
 * `maxWidth` to `fillText` as a last-resort clamp.
 */
export function fitText(
  context: TextMeasurer,
  text: string,
  maxWidth: number,
  max: number,
  min = 12,
  font: (size: number) => string = displayFont,
) {
  let size = Math.max(min, Math.round(max));
  for (;;) {
    context.font = font(size);
    if (size <= min || context.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

/** Fit complete sentences into a fixed number of lines without dropping words. */
export function fitTextLines(
  context: TextMeasurer,
  text: string,
  maxWidth: number,
  maxLines: number,
  maxSize: number,
  minSize: number,
  font: (size: number) => string,
) {
  for (let size = maxSize; ; size -= 1) {
    context.font = font(size);
    const lines: string[] = [];
    let line = "";
    for (const word of text.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines || size <= minSize) return lines;
  }
}

/**
 * Broadcast scanlines: 2-px transparent black rules, so a composite reads as a
 * picture coming off a monitor rather than a flat export. Cheap enough to run
 * over a whole 1280 x 720 frame.
 */
export function scanlines(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha = 0.16,
  step = 4,
) {
  context.save();
  context.fillStyle = `rgba(4,9,13,${alpha})`;
  for (let y = 0; y < height; y += step) context.fillRect(0, y, width, 2);
  context.restore();
}

/**
 * The four corner registration marks every station ident has. Drawn as open
 * L-shapes inset from the frame edge.
 */
export function registrationMarks(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  inset = 26,
  arm = 34,
  color = "#f4eddbcc",
) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 3;
  const corners: [number, number, number, number][] = [
    [inset, inset, 1, 1],
    [width - inset, inset, -1, 1],
    [inset, height - inset, 1, -1],
    [width - inset, height - inset, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    context.beginPath();
    context.moveTo(x + dx * arm, y);
    context.lineTo(x, y);
    context.lineTo(x, y + dy * arm);
    context.stroke();
  }
  context.restore();
}
