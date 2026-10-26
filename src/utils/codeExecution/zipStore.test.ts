import assert from "node:assert/strict";
import test from "node:test";
import { zipStore } from "./zipStore.ts";

test("additional files are a zip the host can unpack", () => {
  const zip = zipStore([{ name: "math.js", content: "module.exports = 1;\n" }]);
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  const text = new TextDecoder().decode(zip);
  assert.match(text, /math\.js/);
  assert.match(text, /module\.exports/);
});
