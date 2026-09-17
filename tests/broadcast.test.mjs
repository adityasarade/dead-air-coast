import test from "node:test";
import assert from "node:assert/strict";
import { cutReducer, emptyCut } from "../lib/broadcast.ts";
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
test("recut clears the warning choice and duplicate warning actions do not rewrite history", () => {
  let c = cutReducer(live(), { type: "pressure", choice: "air", image: second });
  assert.equal(cutReducer(c, { type: "pressure", choice: "protect", image: second }), c);
  c = cutReducer(c, { type: "rewind" });
  assert.equal(c.pressure, "pending");
  assert.equal(c.onAir, first);
});
