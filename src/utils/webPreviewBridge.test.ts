import assert from "node:assert/strict";
import test from "node:test";
import {
  htmlAuthorWarnings,
  previewEpilogue,
  previewPreamble,
} from "./webPreviewBridge.ts";

test("HTML warnings do not fail a missing alt or an unclosed tag", () => {
  const warnings = htmlAuthorWarnings("<p>Hi<img src=\"star.svg\"><banana>");
  assert.ok(warnings.some((item) => item.includes("unclosed")));
  assert.ok(warnings.some((item) => item.includes("alt")));
  assert.ok(warnings.some((item) => item.includes("banana")));
});

test("the preview script replaces alert and posts back to the lesson", () => {
  const preamble = previewPreamble({ stdin: "Ada\n", mocks: { "/hello": { ok: true } } });
  assert.match(preamble, /window\.alert =/);
  assert.match(preamble, /localStorage/);
  assert.match(preamble, /\/hello/);
  const epilogue = previewEpilogue([
    { selector: "h1", text: "Hi" },
  ]);
  assert.match(epilogue, /ryd-web-preview/);
  assert.match(epilogue, /"idle"/);
});
