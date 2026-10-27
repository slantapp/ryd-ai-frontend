import assert from "node:assert/strict";
import test from "node:test";
import {
  interleaveAnswers,
  splitPendingLine,
  emptyOutputHint,
  formatOutputMiss,
  formatRowsMiss,
  friendlyRunError,
  HOST_FILES_MESSAGE,
  judge0RejectionPlan,
  keepExampleOutput,
  normalizeProgramOutput,
  outputsMatch,
  programStdout,
  SQL_HOST_MESSAGE,
  logsAfterTimeLimit,
  MORE_INPUT_MESSAGE,
  TIME_LIMIT_MESSAGE,
  trimProgramOutput,
  versionHostNote,
} from "./runFeedback.ts";
import { renameJavaPublicClass } from "./types.ts";
import { selectJudge0LanguageId } from "./judge0Languages.ts";

test("empty output names the print word", () => {
  assert.match(emptyOutputHint("python"), /print/);
  assert.match(emptyOutputHint("cpp"), /std::cout/);
  assert.equal(
    TIME_LIMIT_MESSAGE,
    "Your program took too long. Check for a loop that never ends.",
  );
});

test("friendly errors keep one learner sentence", () => {
  const python = friendlyRunError(
    'File "script.py", line 3\n    print(x)\nIndentationError: expected an indented block\n',
    "python",
  );
  assert.match(python.summary, /IndentationError on line 3/);
  assert.match(python.summary, /indented/);

  const java = friendlyRunError("Main.java:4: error: ';' expected\n", "java");
  assert.match(java.summary, /Line 4: a semicolon is missing/);

  const node = friendlyRunError(
    "/box/script.js:1\nReferenceError: alert is not defined\n    at Object.<anonymous> (node:internal/modules/cjs/loader:1:1)\n",
    "javascript",
  );
  assert.match(node.summary, /ReferenceError: alert is not defined/);
  assert.doesNotMatch(node.summary, /node:internal/);
  assert.match(node.details, /node:internal/);
});

test("output match trims line ends and one trailing blank line", () => {
  assert.equal(normalizeProgramOutput("Ada \n"), "Ada");
  assert.equal(outputsMatch("Hello\n", "Hello"), true);
  assert.equal(outputsMatch("Hello\n\n", "Hello\n"), true);
  assert.equal(outputsMatch(" Ada", "Ada"), false);
});

test("long output is trimmed", () => {
  const lines = trimProgramOutput("a".repeat(20), 10);
  assert.equal(lines.at(-1), "output trimmed");
});

test("Java public class is renamed only for the runner", () => {
  const source = [
    "public class Hello {",
    "  public static void main(String[] args) {",
    "    System.out.println(\"Hello from the class\");",
    "    // Hello stays in this comment",
    "    Hello h = new Hello();",
    "  }",
    "}",
  ].join("\n");
  const renamed = renameJavaPublicClass(source);
  assert.match(renamed, /public class Main/);
  assert.match(renamed, /Main h = new Main\(\)/);
  assert.match(renamed, /"Hello from the class"/);
  assert.match(renamed, /\/\/ Hello stays in this comment/);
  assert.doesNotMatch(renamed, /class Hello/);
  assert.equal(renameJavaPublicClass("public class Main {}"), "public class Main {}");
});

test("a missed print shows both lines, including a leading space", () => {
  const miss = formatOutputMiss("Bye", "Hi");
  assert.match(miss, /Your program printed:\nBye/);
  assert.match(miss, /The lesson wanted:\nHi/);
  assert.match(formatOutputMiss("", "Hi"), /\(nothing\)/);
  const space = formatOutputMiss(" Ada", "Ada");
  assert.match(space, /extra space/);
  assert.equal(programStdout(["Example output", "Hi", emptyOutputHint("python")]), "Hi");
});

test("a missed query shows the printed rows and the wanted rows", () => {
  const miss = formatRowsMiss("name\nBea", [["name"], ["Ada"]]);
  assert.match(miss, /Bea/);
  assert.match(miss, /Ada/);
});

test("host limits are retried and rejected extra files are not the learner's bug", () => {
  assert.equal(
    judge0RejectionPlan('{"error":"cpu_time_limit is not allowed"}', false).limits,
    false,
  );
  assert.equal(
    judge0RejectionPlan('{"error":"additional_files"}', true).hostMessage,
    HOST_FILES_MESSAGE,
  );
  assert.match(SQL_HOST_MESSAGE, /not a mistake in your code/);
  assert.equal(versionHostNote("22", "JavaScript (Node.js 22.14.0)"), undefined);
  assert.match(versionHostNote("3.11", "Python (3.8.1)") ?? "", /Python \(3\.8\.1\)/);
  assert.equal(versionHostNote("3.11", undefined), undefined);
});

test("example output stays labeled when practice starts", () => {
  assert.deepEqual(keepExampleOutput(["Hi"]), ["Example output", "Hi"]);
  assert.deepEqual(keepExampleOutput(["Example output", "Hi"]), ["Example output", "Hi"]);
  assert.deepEqual(keepExampleOutput(["Running the example…", "Hi"]), ["Example output", "Hi"]);
  assert.deepEqual(
    keepExampleOutput(["✓ Preview updated."], { holdPreview: true }),
    ["Example preview is still on the page. Tap Run to see your own page."],
  );
  assert.deepEqual(keepExampleOutput(["✓ Preview updated."]), []);
});

test("a stopped program keeps what it already printed", () => {
  assert.deepEqual(logsAfterTimeLimit("Starting\n", ""), [
    "Starting",
    TIME_LIMIT_MESSAGE,
  ]);
  assert.deepEqual(logsAfterTimeLimit("tick\ntick\n", null).slice(0, 2), ["tick", "tick"]);
});

test("the short Python error is the last real error, not the traceback", () => {
  const value = friendlyRunError(
    'Traceback (most recent call last):\n  File "/box/script.py", line 4, in <module>\nValueError: invalid literal for int() with base 10: \'3,9,7\'\nRuntime Error (NZEC)\n',
    "python",
  );
  assert.match(value.summary, /ValueError: invalid literal for int\(\) with base 10: '3,9,7' \(line 4\)/);
  assert.doesNotMatch(value.summary, /Traceback|\/box\/|NZEC/);

  const eof = friendlyRunError("EOFError: EOF when reading a line\n", "python");
  assert.equal(eof.summary, MORE_INPUT_MESSAGE);

  const host = friendlyRunError("Runtime Error (NZEC)\n/box/script.py\n", "python");
  assert.equal(host.summary, "The program stopped.");
  assert.doesNotMatch(host.summary, /NZEC|\/box\//);
});

test("typed answers sit on the question line", () => {
  const stdout = "Guess 1 to 10: Too low\nGuess 1 to 10: Too high\nGuess 1 to 10: You got it!\n";
  const cuts = ["Guess 1 to 10: ".length, "Guess 1 to 10: Too low\nGuess 1 to 10: ".length];
  cuts.push(stdout.indexOf("You got it!"));
  assert.equal(
    interleaveAnswers(stdout, ["3", "9", "7"], cuts),
    "Guess 1 to 10: 3\nToo low\nGuess 1 to 10: 9\nToo high\nGuess 1 to 10: 7\nYou got it!\n",
  );
  // A run that printed something else first is shown as printed.
  assert.equal(interleaveAnswers("short", ["3"], [40]), "short");
  assert.deepEqual(splitPendingLine("Too low\nGuess 1 to 10: "), {
    lines: ["Too low"],
    pending: "Guess 1 to 10: ",
  });
  assert.deepEqual(splitPendingLine("Name? "), { lines: [], pending: "Name? " });
});

test("a C++ compile error names the error line, not the caret", () => {
  const value = friendlyRunError(
    "main.cpp: In function 'int main()':\nmain.cpp:4:5: error: 'cout' was not declared in this scope\n    4 |     cout << 1;\n      |     ^~~~\n",
    "cpp",
  );
  assert.match(value.summary, /error: 'cout' was not declared/);
  const abort = friendlyRunError("terminate called after throwing\nRuntime Error (SIGABRT)\n", "cpp");
  assert.doesNotMatch(abort.summary, /SIGABRT/);
});

test("version pin prefers the named runtime", () => {
  const languages = [
    { id: 70, name: "Python (3.8.1)" },
    { id: 71, name: "Python (3.11.2)" },
  ];
  assert.equal(selectJudge0LanguageId(languages, "python", "3.8"), 70);
  assert.equal(selectJudge0LanguageId(languages, "python"), 71);
  assert.equal(selectJudge0LanguageId([], "sqlite"), null);
});
