import test from "node:test";
import assert from "node:assert/strict";
import { sponsors, sponsorAt } from "../lib/sponsors.ts";
import { DISPLAY_STACK, MONO_STACK, displayFont, fitText, monoFont } from "../lib/canvas-type.ts";

/*
 * The competition FAQ requires assets and content the entrant created or has
 * rights to, and explicitly rules out franchise material. Marlin Key's paid
 * programming is the one place in Dead Air where new proper nouns keep getting
 * written, so the similarity check is automated rather than remembered.
 *
 * `forbidden` holds two different things: franchise vocabulary that must never
 * appear anywhere near this project, and real-world trade names that earlier
 * drafts of this list drifted towards (Gulfstream, Kingfisher and Bonita were
 * all rewritten after this check flagged them).
 */
const forbidden = [
  // Franchise vocabulary.
  "rockstar",
  "take-two",
  "take two",
  "grand theft",
  "gta",
  "vice city",
  "liberty city",
  "los santos",
  "san andreas",
  "leonida",
  "lucia",
  "jason",
  "trevor",
  "niko",
  "cj ",
  "ammu-nation",
  "lifeinvader",
  "cluckin",
  "sprunk",
  "maibatsu",
  "vinewood",
  // Real trade names, including the ones earlier drafts of this list landed on
  // and the three that a live-business search rejected (see lib/sponsors.ts).
  "gulfstream",
  "kingfisher",
  "bonita",
  "cormorant",
  "blue ledger",
  "tarpon",
  "marriott",
  "hilton",
  "wells fargo",
  "western union",
  "u-haul",
  "public storage",
  "avis",
  "hertz",
  "allstate",
  "geico",
  "progressive insurance",
  "state farm",
  "sunoco",
  "chevron",
  "bacardi",
  "marlboro",
  "rolex",
  "nike",
  "disney",
  "netflix",
];

test("every paid spot is complete, unique, and in the station's own voice", () => {
  assert.ok(sponsors.length >= 6 && sponsors.length <= 12, "expected 6-12 spots");
  const names = new Set(),
    lines = new Set();
  for (const spot of sponsors) {
    for (const [field, value] of Object.entries(spot)) {
      assert.equal(typeof value, "string", `${field} is not a string`);
      assert.ok(value.trim().length > 0, `${spot.name}: empty ${field}`);
      assert.equal(value, value.trim(), `${spot.name}: untrimmed ${field}`);
    }
    // The name and the small print are bugs and straps: they go on screen in
    // caps, so they are authored in caps rather than upcased at render time.
    assert.equal(spot.name, spot.name.toUpperCase(), `${spot.name}: name is not caps`);
    assert.equal(spot.strap, spot.strap.toUpperCase(), `${spot.name}: strap is not caps`);
    // The spot itself is a sentence, so it is not shouted.
    assert.notEqual(spot.line, spot.line.toUpperCase(), `${spot.name}: line is shouted`);
    assert.ok(spot.line.length <= 90, `${spot.name}: line will not fit one lower third`);
    assert.ok(!names.has(spot.name), `duplicate business: ${spot.name}`);
    assert.ok(!lines.has(spot.line), `duplicate spot: ${spot.line}`);
    names.add(spot.name);
    lines.add(spot.line);
  }
});

test("no paid spot lands on a franchise term or a real trade name", () => {
  const haystack = sponsors
    .map((spot) => `${spot.name} ${spot.line} ${spot.strap}`)
    .join(" | ")
    .toLowerCase();
  for (const term of forbidden) assert.ok(!haystack.includes(term), `found "${term}"`);
});

test("the spot rotation wraps in both directions and never leaves the list", () => {
  for (const index of [0, 3, sponsors.length, sponsors.length * 7 + 2, -1, -sponsors.length - 4]) {
    assert.ok(sponsors.includes(sponsorAt(index)), `index ${index} fell off the list`);
  }
  assert.equal(sponsorAt(0), sponsors[0]);
  assert.equal(sponsorAt(sponsors.length), sponsors[0]);
  assert.equal(sponsorAt(-1), sponsors.at(-1));
});

/*
 * Canvas typography. `fitText` is the reason a long callsign is no longer
 * squashed flat by fillText's maxWidth, so the shrink-to-fit loop is tested
 * against a stub measurer rather than a real canvas: 1 px of width per
 * character per 10 px of font size is enough to exercise the search.
 */
const measurer = () => {
  const stub = {
    font: "",
    measureText(text) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(stub.font)?.[1] ?? 10);
      return { width: (text.length * size) / 10 };
    },
  };
  return stub;
};

test("fitText picks the largest size that fits and leaves the font applied", () => {
  const stub = measurer();
  // "AFTER HOURS TV" is 14 characters, so 1.4 px of width per px of size.
  const size = fitText(stub, "AFTER HOURS TV", 70, 90, 12);
  assert.equal(size, 50);
  assert.equal(stub.measureText("AFTER HOURS TV").width <= 70, true);
  assert.equal(stub.font, displayFont(50));
});

test("fitText never goes below its floor, and never grows past its ceiling", () => {
  const stub = measurer();
  assert.equal(fitText(stub, "X".repeat(400), 40, 90, 18), 18);
  assert.equal(fitText(stub, "OK", 9999, 64, 18), 64);
});

test("fitText can measure in the mono stack too", () => {
  const stub = measurer();
  const size = fitText(stub, "CH 08 / MARLIN KEY", 36, 40, 9, monoFont);
  assert.equal(stub.font, monoFont(size));
  assert.ok(size >= 9 && size <= 40);
});

test("the canvas font stacks name a real fallback on every platform", () => {
  // Impact is a Windows/macOS core font and is absent on Linux and Android, so
  // the composites must not depend on it; every stack has to end in a generic
  // family so the browser is never left guessing.
  for (const stack of [DISPLAY_STACK, MONO_STACK]) {
    assert.ok(!/impact/i.test(stack), `${stack} still asks for Impact`);
    assert.ok(/(sans-serif|monospace)\s*$/.test(stack), `${stack} has no generic fallback`);
  }
  assert.match(displayFont(42), /^900 42px /);
  assert.match(monoFont(18, 700), /^700 18px /);
});
