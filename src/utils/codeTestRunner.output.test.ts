import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSubmissionCodeTest } from "./codeTestRunner.ts";

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
