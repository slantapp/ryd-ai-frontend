import assert from "node:assert/strict";
import test from "node:test";
import { programInputState, programReadsInput, stdinForRun } from "./programInput.ts";
import { CODE_SOLUTION_SPEECH, describeStoredAnswer } from "./storedAnswer.ts";

test("C++ includes are not treated as program input", () => {
  const source = `#include <iostream>\nint main() {\n  std::cout << "Hi";\n  std::cout << "there";\n  return 0;\n}`;
  assert.equal(programReadsInput(source), false);
  assert.equal(stdinForRun({ code: source }), undefined);
});

test("a program that reads input shows the box and uses the authored text", () => {
  const source = "int age;\nstd::cin >> age;";
  assert.equal(programReadsInput(source), true);
  const offer = programInputState({
    key: "q1",
    exampleStdin: "10",
    exampleCode: source,
  });
  assert.equal(offer.show, true);
  assert.equal(offer.prefill, "10");
  assert.equal(stdinForRun({ code: source, stdin: "10" }), "10");
});

test("a question stdin overrides the example", () => {
  assert.equal(
    stdinForRun({ code: "input()", stdin: "Ada" }, "Ada 10"),
    "Ada 10",
  );
});

test("a missed code question points at the editor instead of reading the source", () => {
  const stored = describeStoredAnswer({
    type: "code_test",
    testCriteria: { expectedCode: "std::cout << \"Hi\";" },
  });
  assert.equal(stored.spoken, CODE_SOLUTION_SPEECH);
  assert.equal(stored.code, "std::cout << \"Hi\";");
  assert.equal(stored.spoken?.includes("std::cout"), false);
});
