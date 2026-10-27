import assert from "node:assert/strict";
import test from "node:test";
import {
  IMAGE_LINE_PREFIX,
  instrumentSource,
  shiftScriptLines,
  splitImageLines,
  WAITING_FOR_INPUT_MARKER,
} from "./instrument.ts";
import { parseJudge0Submission } from "./judge0.ts";
import { MORE_INPUT_MESSAGE, TIME_LIMIT_MESSAGE } from "./runFeedback.ts";
import { prepareCodeForExecution } from "./types.ts";

test("Python prints each line at once, and error lines stay the learner's", () => {
  const plain = instrumentSource('print("Starting")\nwhile True:\n    pass\n', "python");
  assert.equal(plain.lineOffset, 1);
  assert.match(plain.source.split("\n")[0], /line_buffering=True/);
  assert.equal(plain.source.split("\n")[1], 'print("Starting")');

  const live = instrumentSource("import random\nx = input()\n", "python", { live: true, seed: 42 });
  assert.match(live.source, /_ryd_random\.seed\(42\)/);
  assert.match(live.source, /_ryd_os\._exit\(3\)/);
  assert.equal(live.source.split("\n")[live.lineOffset], "import random");

  const future = instrumentSource("from __future__ import annotations\nprint(1)\n", "python");
  assert.equal(future.lineOffset, 0);

  assert.equal(
    shiftScriptLines('  File "/box/script.py", line 5, in <module>\nValueError: x', 1),
    '  File "/box/script.py", line 4, in <module>\nValueError: x',
  );
});

test("C and C++ additions go after the learner's code", () => {
  const code = "#include <iostream>\nint main() { srand(time(0)); int x; std::cin >> x; }";
  const plain = instrumentSource(code, "cpp");
  assert.equal(plain.lineOffset, 0);
  assert.ok(plain.source.startsWith(code));
  assert.doesNotMatch(plain.source, new RegExp(WAITING_FOR_INPUT_MARKER));

  const live = instrumentSource(code, "cpp", { live: true, seed: 9 });
  assert.match(live.source, /srand\(9\);/);
  assert.match(live.source, new RegExp(WAITING_FOR_INPUT_MARKER));
  assert.equal(live.source.split("\n")[0], "#include <iostream>");

  assert.match(instrumentSource("int main(){}", "c").source, /_IOLBF/);
  assert.equal(instrumentSource("console.log(1)", "javascript").source, "console.log(1)");
});

test("print() in JavaScript does not move error lines", () => {
  const source = prepareCodeForExecution("print('hi');\nnope();", "javascript");
  assert.equal(source.split("\n")[1], "nope();");
  assert.match(source, /function print\(/);
});

test("a stopped program keeps its output; a C++ wait is not an error", () => {
  const stopped = parseJudge0Submission(
    { stdout: "Starting\n", stderr: "", status: { id: 5, description: "Time Limit Exceeded" } },
    "python",
  );
  assert.deepEqual(stopped.logs, ["Starting", TIME_LIMIT_MESSAGE]);

  const waiting = parseJudge0Submission(
    {
      stdout: "Guess 1 to 10: Too low\nGuess 1 to 10: ",
      stderr: `${WAITING_FOR_INPUT_MARKER}\n`,
      status: { id: 11, description: "Runtime Error (NZEC)" },
    },
    "cpp",
  );
  assert.equal(waiting.waiting, true);
  assert.equal(waiting.stdout, "Guess 1 to 10: Too low\nGuess 1 to 10: ");

  const eof = parseJudge0Submission(
    {
      stdout: "Guess 1 to 10: ",
      stderr: 'Traceback (most recent call last):\n  File "/box/script.py", line 5, in <module>\nEOFError: EOF when reading a line\n',
      status: { id: 11, description: "Runtime Error (NZEC)" },
    },
    "python",
    1,
  );
  assert.equal(eof.waiting, true);

  const value = parseJudge0Submission(
    {
      stdout: "Guess 1 to 10: ",
      stderr: 'Traceback (most recent call last):\n  File "/box/script.py", line 5, in <module>\nValueError: invalid literal for int() with base 10: \'3,9,7\'\n',
      status: { id: 11, description: "Runtime Error (NZEC)" },
    },
    "python",
    1,
  );
  assert.equal(value.logs[1], "ValueError: invalid literal for int() with base 10: '3,9,7' (line 4)");
  assert.ok(!value.logs.includes(MORE_INPUT_MESSAGE));
});

test("a chart line becomes a picture and stays out of the printed text", () => {
  const png = `${IMAGE_LINE_PREFIX}data:image/png;base64,AAAA`;
  const split = splitImageLines(`Mean: 3\n${png}\n`);
  assert.deepEqual(split.images, ["data:image/png;base64,AAAA"]);
  assert.equal(split.text, "Mean: 3\n");
  const parsed = parseJudge0Submission({ stdout: `Mean: 3\n${png}\n`, status: { id: 3, description: "Accepted" } }, "python");
  assert.deepEqual(parsed.logs, ["Mean: 3", png]);
  assert.match(instrumentSource("import matplotlib.pyplot as plt\n", "python").source, /_ryd_mpl\.use\("Agg"\)/);
});
