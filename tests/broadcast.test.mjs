import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTENTION_SEGMENTS,
  PRESSURE_ATTENTION,
  attentionHot,
  attentionSegments,
  attentionTick,
  carriedAttention,
  cutReducer,
  emptyCut,
  episodeBeats,
} from "../lib/broadcast.ts";
const ident = "data:image/png;base64,IDENT",
  first = "data:image/png;base64,USER1",
  second = "data:image/png;base64,USER2";
function live() {
  let c = cutReducer(emptyCut, { type: "ident", image: ident });
  c = cutReducer(c, { type: "save", image: first, source: "dock" });
  return cutReducer(c, { type: "live" });
}
test("native saved content propagates unchanged through preview, on-air and history", () => {
  let c = cutReducer(emptyCut, { type: "ident", image: ident });
  c = cutReducer(c, { type: "save", image: first, source: "dock" });
  assert.equal(c.onAir, ident);
  assert.equal(c.preview, first);
  c = cutReducer(c, { type: "live" });
  assert.equal(c.onAir, first);
  assert.equal(c.shots[1].image, first);
});
test("taking caller preserves the picture while switching changes actual picture", () => {
  const a = cutReducer(live(), { type: "decide", decision: "call" }),
    b = cutReducer(live(), { type: "decide", decision: "switch", image: second });
  assert.equal(a.onAir, first);
  assert.equal(b.onAir, second);
  assert.notEqual(a.shots.at(-1).caption, b.shots.at(-1).caption);
});
test("correction retains first edit and recut restores the interruption without losing authored image", () => {
  let c = cutReducer(live(), { type: "decide", decision: "revise" });
  c = cutReducer(c, { type: "save", image: second, source: "party" });
  c = cutReducer(c, { type: "live" });
  assert.equal(c.corrected, true);
  assert.equal(c.shots[1].image, first);
  assert.equal(c.shots.at(-1).image, second);
  c = cutReducer(c, { type: "close" });
  c = cutReducer(c, { type: "rewind" });
  assert.equal(c.decision, "pending");
  // A recut rewinds the night, not the visitor's work: the NEWEST plate comes
  // back on air and every authored plate stays in history.
  assert.equal(c.onAir, second);
  assert.equal(c.preview, second);
  assert.equal(c.source, "party");
  assert.equal(c.ident, ident);
  assert.deepEqual(
    c.shots.map((s) => s.kind),
    ["ident", "plate", "plate"],
  );
  assert.deepEqual(
    c.shots.map((s) => s.image),
    [ident, first, second],
  );
  assert.deepEqual(
    c.shots.map((s) => s.id),
    [1, 2, 3],
  );
});

test("recut with a single plate keeps ident plus that plate", () => {
  let c = cutReducer(live(), { type: "decide", decision: "hold" });
  c = cutReducer(c, { type: "pressure", choice: "air", image: second });
  c = cutReducer(c, { type: "close" });
  c = cutReducer(c, { type: "rewind" });
  assert.equal(c.shots.length, 2);
  assert.equal(c.onAir, first);
  assert.equal(c.pressure, "pending");
});

test("every plate in one episode carries its own caption", () => {
  let c = cutReducer(live(), { type: "save", image: second, source: "party" });
  c = cutReducer(c, { type: "live" });
  const captions = c.shots.filter((s) => s.kind === "plate").map((s) => s.caption);
  assert.equal(captions.length, 2);
  assert.equal(new Set(captions).size, 2);
});

test("recut with no plate at all is a no-op", () => {
  const identOnly = cutReducer(emptyCut, { type: "ident", image: ident });
  assert.equal(cutReducer(identOnly, { type: "rewind" }), identOnly);
});
test("empty preview cannot create fake live image", () => {
  assert.equal(cutReducer(emptyCut, { type: "live" }), emptyCut);
});
test("warning choice changes what airs while preserving the users edited plate", () => {
  const c = cutReducer(live(), { type: "decide", decision: "hold" });
  const exposed = cutReducer(c, { type: "pressure", choice: "air", image: second });
  const protectedCut = cutReducer(c, { type: "pressure", choice: "protect", image: second });
  assert.equal(exposed.onAir, second);
  assert.equal(protectedCut.onAir, first);
  assert.equal(exposed.shots[1].image, first);
  assert.equal(protectedCut.shots.at(-1).image, first);
  assert.notEqual(exposed.shots.at(-1).caption, protectedCut.shots.at(-1).caption);
});
test("episode ledger preserves the picture, caller and warning decisions", () => {
  let c = live();
  c = cutReducer(c, { type: "decide", decision: "call" });
  c = cutReducer(c, { type: "pressure", choice: "protect", image: second });
  const beats = episodeBeats(c);
  assert.deepEqual(
    beats.map((beat) => beat.label),
    ["PICTURE", "LINE", "WARNING"],
  );
  assert.equal(beats[0].headline, "AUCTION DOCK");
  assert.equal(beats[1].headline, "CALLER PATCHED IN");
  assert.equal(beats[2].headline, "SOURCE PROTECTED");
  assert.match(beats[0].detail, /1 authored cut/);
});
test("recut clears the warning choice and duplicate warning actions do not rewrite history", () => {
  let c = cutReducer(live(), { type: "pressure", choice: "air", image: second });
  assert.equal(cutReducer(c, { type: "pressure", choice: "protect", image: second }), c);
  c = cutReducer(c, { type: "rewind" });
  assert.equal(c.pressure, "pending");
  assert.equal(c.onAir, first);
});

/*
 * Broadcast attention. It is fiction, but it gates the fixer's warning, so it
 * has to be monotonic and it has to actually reach the threshold: an estimate
 * that could stall below PRESSURE_ATTENTION would leave a visitor on the desk
 * with nothing left to happen.
 */
test("attention only ever climbs, at any roll", () => {
  for (const roll of [0, 0.5, 1, -3, 7, Number.NaN]) {
    const next = attentionTick(100, Number.isNaN(roll) ? 0 : roll);
    assert.ok(next > 100, `roll ${roll} produced ${next}`);
  }
});
test("attention reaches the warning threshold from silence in a bounded number of ticks", () => {
  let value = 0,
    ticks = 0;
  while (!attentionHot(value) && ticks < 1000) {
    // Worst case: every roll comes up zero.
    value = attentionTick(value, 0);
    ticks += 1;
  }
  assert.ok(attentionHot(value), "never became hot");
  assert.ok(ticks < 30, `took ${ticks} ticks at the slowest possible growth`);
});
test("the meter fills exactly as the threshold is reached and never overflows", () => {
  assert.equal(attentionSegments(0), 0);
  assert.equal(attentionSegments(1), 1);
  assert.equal(attentionSegments(PRESSURE_ATTENTION), ATTENTION_SEGMENTS);
  assert.equal(attentionSegments(PRESSURE_ATTENTION * 12), ATTENTION_SEGMENTS);
  assert.equal(attentionSegments(-50), 0);
  // The last segment belongs to the threshold, so nothing below it reads full.
  assert.equal(attentionSegments(PRESSURE_ATTENTION - 1), ATTENTION_SEGMENTS - 1);
  for (let value = 1; value < PRESSURE_ATTENTION; value += 1)
    assert.ok(attentionSegments(value) < ATTENTION_SEGMENTS, `${value} read full`);
  assert.equal(attentionHot(PRESSURE_ATTENTION - 1), false);
  assert.equal(attentionHot(PRESSURE_ATTENTION), true);
});
test("a second night inherits some attention but never starts hot", () => {
  assert.equal(carriedAttention(0), 0);
  assert.ok(carriedAttention(PRESSURE_ATTENTION) > 0);
  for (const value of [PRESSURE_ATTENTION, PRESSURE_ATTENTION * 2, 50_000, -10]) {
    const carried = carriedAttention(value);
    assert.ok(carried >= 0, `negative carry from ${value}`);
    assert.equal(attentionHot(carried), false, `night two opened hot from ${value}`);
    assert.ok(attentionSegments(carried) < ATTENTION_SEGMENTS);
  }
});
