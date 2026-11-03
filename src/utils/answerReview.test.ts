import assert from "node:assert/strict";
import test from "node:test";
import { buildAnswerReview } from "./answerReview.ts";
import { LESSON_INPUT_PROMPT, programInputState, READ_ALL_INPUT_PROMPT } from "./programInput.ts";

test("a web lesson's model page in code_example is the answer to compare", () => {
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: { html: "<h1 id='t'>Hi</h1>", css: "h1{color:red}", code: "t.textContent = 'Hello!';" },
      testCriteria: {},
    },
    { code: "", web: { html: "<h1 id='t'>Hi</h1>", css: "h1{color:red}", javascript: "t.textContent = 'Hi';" } },
    { web: true, language: "javascript" },
  );
  assert.ok(review && "web" in review.answer);
  assert.equal(review.answer.web.javascript, "t.textContent = 'Hello!';");
  assert.equal(review.answer.web.html, "<h1 id='t'>Hi</h1>");
  assert.ok("web" in review.learner && review.learner.web.javascript === "t.textContent = 'Hi';");
});

test("expected answers win over the example, and a regex check is never shown as code", () => {
  const web = buildAnswerReview(
    { type: "code_test", code_example: { code: "old" }, testCriteria: { expectedJS: "new()", expectedCode: "regex:.*" } },
    { code: "" },
    { web: true, language: "javascript" },
  );
  assert.ok(web && "web" in web.answer && web.answer.web.javascript === "new()");

  const python = buildAnswerReview(
    { type: "code_test", code_example: { code: "print(1)" }, testCriteria: { expectedCode: "regex:print" } },
    { code: "print(2)" },
    { web: false, language: "python" },
  );
  assert.deepEqual(python?.answer, { code: "print(1)" });
  assert.deepEqual(python?.learner, { code: "print(2)" });
});

test("no stored answer means nothing to compare", () => {
  assert.equal(buildAnswerReview({ type: "code_test", testCriteria: {} }, { code: "x" }, { web: false, language: "python" }), null);
  assert.equal(buildAnswerReview({ type: "multiple_choice" }, { code: "x" }, { web: false, language: "python" }), null);
});

test("no language shows the Input box", () => {
  const loopUntilEnd = programInputState({
    key: "a",
    language: "cpp",
    editorCode: "int main(){ int x; while (std::cin >> x) { std::cout << x; } }",
    questionStdin: "1\n2\n",
  });
  // C++ cin until the input ends: one answer at a time, with "No more input" in the pop-up.
  assert.equal(loopUntilEnd.show, false);
  assert.equal(loopUntilEnd.mode, "live");

  // scanf in a loop cannot stop and ask, so every line is asked for before the run.
  const scanfLoop = programInputState({
    key: "c2",
    language: "c",
    editorCode: 'int x; while (scanf("%d", &x) == 1) { printf("%d", x); }',
  });
  assert.equal(scanfLoop.mode, "lines");
  assert.deepEqual(scanfLoop.prompts, [READ_ALL_INPUT_PROMPT]);

  const stdinLoop = programInputState({ key: "b", language: "python", editorCode: "import sys\nfor line in sys.stdin:\n    print(line)" });
  assert.equal(stdinLoop.mode, "lines");
  assert.equal(stdinLoop.show, false);

  const guessLoop = programInputState({ key: "c", language: "python", editorCode: "while True:\n    g = input('Guess: ')\n    if g == '3':\n        break" });
  assert.equal(guessLoop.mode, "live");

  // The lesson gives input but no read is recognised: the learner checks it in the pop-up.
  const preset = programInputState({ key: "d", language: "python", editorCode: "print('hi')", questionStdin: "5\n" });
  assert.equal(preset.show, false);
  assert.equal(preset.mode, "lines");
  assert.deepEqual(preset.prompts, [LESSON_INPUT_PROMPT]);
  assert.equal(preset.prefill, "5\n");
});

test("every runner language with input uses a pop-up", () => {
  const cases: [string, string, "prompt" | "lines"][] = [
    ["java", "Scanner s = new Scanner(System.in);\nint n = s.nextInt();", "prompt"],
    ["java", "Scanner s = new Scanner(System.in);\nwhile (s.hasNext()) { System.out.println(s.nextLine()); }", "lines"],
    ["c", 'int n; scanf("%d", &n); printf("%d", n);', "prompt"],
    ["csharp", "var name = Console.ReadLine();", "prompt"],
    ["go", "var n int\nfmt.Scan(&n)", "prompt"],
    ["ruby", "name = gets", "prompt"],
    ["javascript", "const data = require('fs').readFileSync(0, 'utf8');", "lines"],
    ["php", "$line = fgets(STDIN);", "prompt"],
    ["kotlin", "val name = readLine()", "prompt"],
    ["rust", "std::io::stdin().read_line(&mut s).unwrap();", "prompt"],
    ["bash", "read name\necho $name", "prompt"],
  ];
  for (const [language, editorCode, mode] of cases) {
    const offer = programInputState({ key: language, language, editorCode });
    assert.equal(offer.show, false, language);
    assert.equal(offer.mode, mode, `${language}: ${editorCode}`);
  }
});
