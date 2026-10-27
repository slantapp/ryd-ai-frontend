import assert from "node:assert/strict";
import test from "node:test";
import { buildWebPreviewDocument } from "./webCodeWorkspace.ts";
import { LEARNER_SCRIPT_MARKER, mapLearnerErrorLine } from "./webPreviewBridge.ts";
import {
  evaluateSubmissionCodeTest,
  submissionHasContent,
} from "./codeTestRunner.ts";

test("expected output names the printed line and the wanted line", () => {
  const miss = evaluateSubmissionCodeTest(
    { code: "print('Bye')", language: "python" },
    { expectedOutput: "Hi" },
    ["Bye"],
  );
  assert.equal(miss.passed, false);
  assert.match(miss.testResults[0].test, /Your program printed:\nBye/);
  assert.match(miss.testResults[0].test, /The lesson wanted:\nHi/);

  const space = evaluateSubmissionCodeTest(
    { code: "print(' Ada')", language: "python" },
    { expectedOutput: "Ada" },
    [" Ada"],
  );
  assert.match(space.testResults[0].test, /extra space/);

  const empty = evaluateSubmissionCodeTest(
    { code: "name = 'Ada'", language: "python" },
    { expectedOutput: "Hi" },
    ["Your program ran, but didn't print anything. Add print to show a result."],
  );
  assert.match(empty.testResults[0].test, /\(nothing\)/);
  assert.match(empty.testResults[0].test, /The lesson wanted:\nHi/);

  const broken = evaluateSubmissionCodeTest(
    { code: "if True:\nprint('Hi')", language: "python" },
    { expectedOutput: "Hi" },
    ["IndentationError on line 2: the lines inside an if must be indented by the same amount."],
  );
  assert.match(broken.testResults[0].test, /IndentationError/);
  assert.doesNotMatch(broken.testResults[0].test, /The lesson wanted/);

  const pass = evaluateSubmissionCodeTest(
    { code: "print('Hi')", language: "python" },
    { expectedOutput: "Hi", expectedCode: "print('this source is not the answer')" },
    ["Hi"],
  );
  assert.equal(pass.passed, true);
});

test("web submit sees the page panes, and a guessing loop asks again", () => {
  assert.equal(
    submissionHasContent(
      {
        code: "",
        language: "javascript",
        runtime: "web",
        webCode: { html: "<h1 id=\"title\">Hi</h1>", css: "h1{}", javascript: "" },
      },
      undefined,
    ),
    true,
  );
  assert.equal(
    submissionHasContent({ code: "", language: "javascript", webCode: { html: "", css: "", javascript: "" } }, undefined),
    false,
  );
  assert.equal(
    submissionHasContent(
      { code: "print(1)", language: "python", webCode: { html: "", css: "", javascript: "" } },
      undefined,
    ),
    true,
  );
  const javascript = Array.from({ length: 99 }, (_, index) =>
    index === 69 ? "throw new Error('boom');" : "void 0;",
  ).join("\n");
  const doc = buildWebPreviewDocument({
    html: "<h1>Hi</h1>",
    css: "h1 { color: red; }",
    javascript,
  });
  const markerLine = doc.slice(0, doc.indexOf(LEARNER_SCRIPT_MARKER)).split("\n").length;
  assert.equal(mapLearnerErrorLine(markerLine + 70, markerLine, 99), 70);
  assert.match(doc, /var learnerMarkerLine = \d+;/);
});

test("expected rows name the printed table and the wanted table", () => {
  const miss = evaluateSubmissionCodeTest(
    { code: "SELECT name FROM kids;", language: "sql" },
    { expectedRows: [["name"], ["Ada"]] },
    ["name", "Bea"],
  );
  assert.equal(miss.passed, false);
  assert.match(miss.testResults[0].test, /Bea/);
  assert.match(miss.testResults[0].test, /name \| Ada|Ada/);
});

test("turtle checks grade the recorded drawing on Submit", () => {
  const submission = { code: "import turtle\n", language: "python" };
  const criteria = { turtleChecks: [{ linesDrawn: 4 }, { colorUsed: "blue" }, { filled: true }] };
  const missing = evaluateSubmissionCodeTest(submission, criteria, []);
  assert.equal(missing.passed, false);
  assert.match(missing.testResults[0].test, /Run the drawing/);
  const square = { linesDrawn: 4, colors: ["#0000ff"], filled: true, texts: [], end: { x: 0, y: 0 }, heading: 0 };
  assert.equal(evaluateSubmissionCodeTest(submission, criteria, [], undefined, square).passed, true);
  const three = { ...square, linesDrawn: 3 };
  const miss = evaluateSubmissionCodeTest(submission, criteria, [], undefined, three);
  assert.equal(miss.passed, false);
  assert.match(miss.testResults.find((item) => !item.passed)!.test, /should draw 4 lines\. It drew 3/);
});
