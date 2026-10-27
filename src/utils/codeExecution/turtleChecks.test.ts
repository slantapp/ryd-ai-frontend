import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTurtleChecks, plainColor } from "./turtleChecks.ts";

test("turtle checks pass and fail with a plain sentence", () => {
  const record = {
    linesDrawn: 4,
    colors: ["#0000ff"],
    filled: true,
    texts: ["Score: 3"],
    end: { x: 1.5, y: -0.5 },
    heading: 359.5,
  };
  const results = evaluateTurtleChecks(record, [
    { linesDrawn: 4 },
    { endsAt: [0, 0], tolerance: 2 },
    { heading: 0 },
    { colorUsed: "blue" },
    { filled: true },
    { textWritten: "Score: 3" },
  ]);
  assert.deepEqual(results.map((item) => item.passed), [true, true, true, true, true, true]);

  const misses = evaluateTurtleChecks({ ...record, linesDrawn: 3, end: { x: 100, y: 0 } }, [
    { linesDrawn: 4 },
    { endsAt: [0, 0] },
    { colorUsed: "red" },
    { filled: false },
    { textWritten: "Score: 4" },
  ]);
  assert.ok(misses.every((item) => !item.passed));
  assert.equal(misses[0].test, "The turtle should draw 4 lines. It drew 3.");
  assert.equal(misses[1].test, "The turtle should end at (0, 0). It ended at (100, 0).");
});

test("colour names and RGB numbers compare equal", () => {
  assert.equal(plainColor("Blue"), "#0000ff");
  assert.equal(plainColor("rgb(255,0,0)"), "#ff0000");
  assert.equal(plainColor("#F00"), "#ff0000");
  assert.equal(plainColor("light blue"), "#add8e6");
});
