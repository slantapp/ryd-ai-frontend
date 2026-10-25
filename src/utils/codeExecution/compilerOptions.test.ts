import assert from "node:assert/strict";
import test from "node:test";
import { compilerOptionsFor } from "./compilerOptions.ts";

test("C and C++ are linked with the thread library", () => {
  assert.equal(compilerOptionsFor("cpp"), "-pthread");
  assert.equal(compilerOptionsFor("c++"), "-pthread");
  assert.equal(compilerOptionsFor("c"), "-pthread");
});

test("other languages keep Judge0's own compile command", () => {
  assert.equal(compilerOptionsFor("python"), undefined);
  assert.equal(compilerOptionsFor("java"), undefined);
  assert.equal(compilerOptionsFor(undefined), undefined);
});
