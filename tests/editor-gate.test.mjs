import test from "node:test";
import assert from "node:assert/strict";
import { judgeEditorSave, comparableImages } from "../lib/editor-gate.ts";

// Real encoded bitmaps, not short placeholders: the gate only compares strings
// that actually look like image data (see comparableImages).
const base = "data:image/png;base64," + "A".repeat(900);
const edit = "data:image/png;base64," + "B".repeat(900);

test("a dirty flag seen during editing always allows the save", () => {
  const verdict = judgeEditorSave({
    saved: base,
    baseline: base,
    current: base,
    sawChanges: true,
    changeTrackingAvailable: true,
  });
  assert.equal(verdict.edited, true);
  assert.equal(verdict.reason, "tracked-changes");
});

test("a post-save dirty-flag reset cannot reject a real edit", () => {
  // The runtime cleared hasChanges() on save, so sawChanges is the only record.
  const verdict = judgeEditorSave({
    saved: edit,
    baseline: base,
    current: edit,
    sawChanges: true,
    changeTrackingAvailable: true,
  });
  assert.equal(verdict.edited, true);
});

test("differing getImage snapshots prove an edit even with no dirty flag", () => {
  const verdict = judgeEditorSave({
    saved: edit,
    baseline: base,
    current: edit,
    sawChanges: false,
    changeTrackingAvailable: false,
  });
  assert.equal(verdict.edited, true);
  assert.equal(verdict.reason, "snapshot-differs");
});

test("identical snapshots reject an untouched save when the dirty flag was readable", () => {
  const verdict = judgeEditorSave({
    saved: base,
    baseline: base,
    current: base,
    sawChanges: false,
    changeTrackingAvailable: true,
  });
  assert.equal(verdict.edited, false);
  assert.equal(verdict.reason, "snapshot-identical");
});

test("identical snapshots plus an unreadable dirty flag fall back to the saved data URL", () => {
  // A stale or stubbed getImage() must not be able to block a genuine edit.
  const blocked = judgeEditorSave({
    saved: edit,
    baseline: base,
    current: base,
    sawChanges: false,
    changeTrackingAvailable: false,
  });
  assert.equal(blocked.edited, true);
  assert.equal(blocked.reason, "saved-differs");
});

test("a saved data URL equal to the starting image is rejected", () => {
  const verdict = judgeEditorSave({
    saved: base,
    baseline: base,
    current: null,
    sawChanges: false,
    changeTrackingAvailable: false,
  });
  assert.equal(verdict.edited, false);
  assert.equal(verdict.reason, "saved-identical");
});

test("a saved data URL differing from the starting image is a real edit", () => {
  const verdict = judgeEditorSave({
    saved: edit,
    baseline: base,
    current: null,
    sawChanges: false,
    changeTrackingAvailable: true,
  });
  assert.equal(verdict.edited, true);
  assert.equal(verdict.reason, "saved-differs");
});

test("no baseline but a readable dirty flag still rejects an untouched save", () => {
  const verdict = judgeEditorSave({
    saved: edit,
    baseline: null,
    current: null,
    sawChanges: false,
    changeTrackingAvailable: true,
  });
  assert.equal(verdict.edited, false);
  assert.equal(verdict.reason, "no-tracked-changes");
});

test("nothing measurable fails OPEN so the experience stays completable", () => {
  for (const signals of [
    {
      saved: edit,
      baseline: null,
      current: null,
      sawChanges: false,
      changeTrackingAvailable: false,
    },
    { saved: "", baseline: "", current: "", sawChanges: false, changeTrackingAvailable: false },
  ]) {
    const verdict = judgeEditorSave(signals);
    assert.equal(verdict.edited, true, JSON.stringify(signals));
    assert.equal(verdict.reason, "unverifiable");
  }
});

test("a missing editor instance (every signal absent) allows the save", () => {
  const verdict = judgeEditorSave({
    saved: edit,
    baseline: null,
    current: null,
    sawChanges: false,
    changeTrackingAvailable: false,
  });
  assert.equal(verdict.edited, true);
});

test("a source URL or an empty canvas is never treated as a comparable snapshot", () => {
  assert.equal(comparableImages("/art/dock.png", base), false);
  assert.equal(comparableImages("data:image/png;base64,AAAA", base), false);
  assert.equal(comparableImages(base, edit), true);
  // Baseline captured before the image was in the canvas: the dirty flag, not
  // the bogus snapshot, decides — so an untouched save is still rejected.
  const verdict = judgeEditorSave({
    saved: edit,
    baseline: "/art/dock.png",
    current: base,
    sawChanges: false,
    changeTrackingAvailable: true,
  });
  assert.equal(verdict.edited, false);
  assert.equal(verdict.reason, "no-tracked-changes");
});
