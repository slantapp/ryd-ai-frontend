import assert from "node:assert/strict";
import { evaluateCodeTest, matchExpectedCode, outputAgreesWithExpected } from "../src/utils/codeTestValidation";

const cpp = `#include <iostream>
int main() {
  int values[1];
  values[0] = 7;
  std::cout << values[0] << "\\n";
  return 0;
}
`;

const cppExpected = "values[0] = 7";
assert.equal(
  matchExpectedCode(cpp, cppExpected, "cpp"),
  true,
  "correct C++ with an array index must pass",
);
assert.equal(
  evaluateCodeTest(cpp, { expectedCode: cppExpected }, "cpp").passed,
  true,
);

assert.equal(
  evaluateCodeTest(cpp, { expectedCode: "values[1] = 7" }, "cpp").passed,
  false,
  "wrong C++ index must fail",
);

const helloCpp = 'std::cout << "Hello";';
assert.equal(
  outputAgreesWithExpected(["Hello"], { expectedCode: helloCpp }),
  true,
  "printed Hello matches a C++ print snippet",
);
assert.equal(
  outputAgreesWithExpected(["Bye"], { expectedCode: helloCpp }),
  false,
);

const python = "items = [1, 2]\nprint(items[0])\n";
assert.equal(
  evaluateCodeTest(python, { expectedCode: "items[0]" }, "python").passed,
  true,
);
assert.equal(
  evaluateCodeTest("print(items[1])", { expectedCode: "items[0]" }, "python").passed,
  false,
);

assert.equal(
  evaluateCodeTest('let message = "hi";', { expectedCode: "let message" }, "javascript").passed,
  true,
);
assert.equal(
  evaluateCodeTest("let other = 1;", { expectedCode: "let message" }, "javascript").passed,
  false,
);

const unknown = evaluateCodeTest("cout << 1;", { expectedCode: "cout << 1;" }, "brainfuck");
assert.equal(unknown.passed, false);
assert.match(unknown.testResults[0]?.test ?? "", /brainfuck/);

const spaced = "cout << \"Hello\" ;";
assert.equal(
  evaluateCodeTest(spaced, { expectedCode: 'cout<<"Hello";' }, "cpp").passed,
  true,
  "C++ spacing must not fail a correct answer",
);

console.log("code answer checks passed");
