import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLearnerLineMap,
  htmlAuthorWarnings,
  LEARNER_SCRIPT_MARKER,
  mapLearnerErrorLine,
  previewEpilogue,
  previewPreamble,
} from "./webPreviewBridge.ts";

test("HTML warnings do not fail a missing alt or an unclosed tag", () => {
  const warnings = htmlAuthorWarnings("<p>Hi<img src=\"star.svg\"><banana>");
  assert.ok(warnings.some((item) => item.includes("unclosed")));
  assert.ok(warnings.some((item) => item.includes("alt")));
  assert.ok(warnings.some((item) => item.includes("banana")));
});

test("a preview error line is the line in the learner's JavaScript", () => {
  const markerLine = 100;
  assert.equal(mapLearnerErrorLine(markerLine + 70, markerLine, 99), 70);
  assert.equal(mapLearnerErrorLine(markerLine, markerLine, 99), undefined);
  assert.equal(mapLearnerErrorLine(markerLine + 100, markerLine, 99), undefined);
  const documentHtml = `<script>\n${LEARNER_SCRIPT_MARKER}\nthrow new Error("boom");\n</script>\nvar learnerMarkerLine = __RYD_LEARNER_LINE__;\nvar learnerLineCount = __RYD_LEARNER_COUNT__;`;
  const mapped = applyLearnerLineMap(documentHtml, 1);
  assert.match(mapped, /var learnerMarkerLine = 2;/);
  assert.match(mapped, /var learnerLineCount = 1;/);
  assert.doesNotMatch(mapped, /__RYD_LEARNER_/);
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
