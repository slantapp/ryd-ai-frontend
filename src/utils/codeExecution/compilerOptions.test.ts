import assert from "node:assert/strict";
import test from "node:test";
import { compilerOptionsFor } from "./compilerOptions.ts";

test("C and C++ are linked with the thread library", () => {
  assert.equal(compilerOptionsFor("cpp"), "-std=c++20 -pthread");
  assert.equal(compilerOptionsFor("c++"), "-std=c++20 -pthread");
  assert.equal(compilerOptionsFor("c"), "-std=c17 -pthread -lm");
});

test("other languages keep Judge0's own compile command", () => {
  assert.equal(compilerOptionsFor("python"), undefined);
  assert.equal(compilerOptionsFor("java"), undefined);
  assert.equal(compilerOptionsFor(undefined), undefined);
});
