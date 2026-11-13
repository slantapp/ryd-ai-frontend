import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnswerReview,
  looksLikeReadableSource,
  looksLikeRegexDebris,
  modelMainAnswer,
  sampleFromExpectedRegex,
  webAnswerPane,
} from "./answerReview.ts";
import { CODE_RUN_LANGUAGES } from "./codeExecution/languages.ts";
import { LESSON_INPUT_PROMPT, programInputState, READ_ALL_INPUT_PROMPT } from "./programInput.ts";

/** Snippets that pass a shared `regex:ok_marker` check — one per runner + web language. */
const REGEX_SAFE_SNIPPETS: Record<string, string> = {
  javascript: 'console.log("ok_marker");',
  typescript: 'const x: string = "ok_marker";',
  python: 'print("ok_marker")',
  dart: 'print("ok_marker");',
  java: 'System.out.println("ok_marker");',
  kotlin: 'println("ok_marker")',
  c: 'printf("ok_marker");',
  cpp: 'std::cout << "ok_marker";',
  csharp: 'Console.WriteLine("ok_marker");',
  go: 'fmt.Println("ok_marker")',
  rust: 'println!("ok_marker");',
  php: 'echo "ok_marker";',
  ruby: 'puts "ok_marker"',
  bash: 'echo ok_marker',
  lua: 'print("ok_marker")',
  perl: 'print "ok_marker";',
  swift: 'print("ok_marker")',
  html: "<p>ok_marker</p>",
  css: "p { content: 'ok_marker'; }",
};

test("webAnswerPane follows the course language", () => {
  assert.equal(webAnswerPane("html"), "html");
  assert.equal(webAnswerPane("HTML"), "html");
  assert.equal(webAnswerPane("css"), "css");
  assert.equal(webAnswerPane("javascript"), "javascript");
  assert.equal(webAnswerPane("js"), "javascript");
  assert.equal(webAnswerPane(undefined), "html");
});

test("HTML course expectedCode lands in the HTML pane, not JavaScript", () => {
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: {
        language: "html",
        runtime: "web",
        code: "<h1>Demo only — not the graded answer</h1>",
      },
      testCriteria: {
        expectedCode: "<h1 class=\"hero\">Page title</h1>",
      },
    },
    {
      code: "",
      web: { html: "<h1>Wrong</h1>", css: "", javascript: "" },
    },
    { web: true, language: "html" },
  );
  assert.ok(review && "web" in review.answer);
  assert.equal(review.answer.web.html, '<h1 class="hero">Page title</h1>');
  assert.equal(review.answer.web.javascript, "");
  assert.equal(review.language, "html");
});

test("HTML Step 8: regex expectedCode + starter shows Leo, not the Ada demo", () => {
  const expectedCode =
    "regex:<footer(?:\\s[^>]*)?>\\s*<p(?:\\s[^>]*)?>\\s*Made\\s+by\\s+Leo\\s*</p\\s*>\\s*</footer\\s*>";
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: {
        language: "html",
        runtime: "web",
        code: "<header>\n  <h1>Ada's Pets</h1>\n</header>\n<p>Welcome to my page about pets.</p>\n<footer>\n  <p>Made by Ada, 2026</p>\n</footer>\n",
        starterCode:
          "<header>\n  <h1>Leo's Robots</h1>\n</header>\n<p>I build robots from boxes.</p>\n<!-- TODO: add a footer with a paragraph that says Made by Leo -->\n\n",
        css: "footer { color: #555; }",
      },
      testCriteria: { expectedCode },
    },
    {
      code: "",
      web: {
        html: "<header><h1>Leo's Robots</h1></header><p>I build robots from boxes.</p>",
        css: "",
        javascript: "",
      },
    },
    { web: true, language: "html" },
  );
  assert.ok(review && "web" in review.answer);
  assert.match(review.answer.web.html, /Leo's Robots/);
  assert.match(review.answer.web.html, /Made by Leo/);
  assert.doesNotMatch(review.answer.web.html, /Ada/);
  assert.equal(review.language, "html");
});

test("sampleFromExpectedRegex turns a footer check into readable HTML", () => {
  const sample = sampleFromExpectedRegex(
    "regex:<footer(?:\\s[^>]*)?>\\s*<p(?:\\s[^>]*)?>\\s*Made\\s+by\\s+Leo\\s*</p\\s*>\\s*</footer\\s*>",
  );
  assert.match(sample, /<footer>/i);
  assert.match(sample, /Made by Leo/);
  assert.match(sample, /<\/footer>/i);
});

test("modelMainAnswer never prefers the demo when a practice starter exists", () => {
  const answer = modelMainAnswer({
    language: "html",
    expectedCode: "regex:<footer[\\s\\S]*Made\\s+by\\s+Leo[\\s\\S]*</footer>",
    starterCode: "<p>Hi</p>\n<!-- TODO -->\n",
    exampleCode: "<footer><p>Made by Ada</p></footer>",
  });
  assert.match(answer, /Made by Leo/);
  assert.doesNotMatch(answer, /Ada/);
});

test("expectedHTML/CSS/JS win over expectedCode and the example", () => {
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: {
        language: "html",
        html: "<p>example</p>",
        css: "p{}",
        code: "console.log(1)",
      },
      testCriteria: {
        expectedHTML: "<p>from criteria</p>",
        expectedCSS: "p{color:red}",
        expectedJS: "console.log(2)",
        expectedCode: "<p>should not win over expectedHTML</p>",
      },
    },
    { code: "" },
    { web: true, language: "html" },
  );
  assert.ok(review && "web" in review.answer);
  assert.equal(review.answer.web.html, "<p>from criteria</p>");
  assert.equal(review.answer.web.css, "p{color:red}");
  assert.equal(review.answer.web.javascript, "console.log(2)");
});

test("a JS web lesson's model page in code_example is the answer when criteria omit panes", () => {
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

test("CSS course expectedCode lands in the CSS pane", () => {
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: { language: "css", code: "h1 { color: blue; }", html: "<h1>Hi</h1>" },
      testCriteria: { expectedCode: "h1 { color: red; }" },
    },
    { code: "", web: { html: "<h1>Hi</h1>", css: "h1{}", javascript: "" } },
    { web: true, language: "css" },
  );
  assert.ok(review && "web" in review.answer);
  assert.equal(review.answer.web.css, "h1 { color: red; }");
  assert.equal(review.answer.web.html, "<h1>Hi</h1>");
  assert.equal(review.answer.web.javascript, "");
  assert.equal(review.language, "css");
});

test("CSS regex expectedCode never shows regex debris — uses the authored solution", () => {
  const expectedCode =
    "regex:(?:^|[\\s}])p[\\w.#:\\s-]*\\{[^}]*color\\s*:\\s*green[^}]*\\}";
  const solution = "h1 {\n  color: brown;\n}\np {\n  color: green;\n}\n";
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: {
        language: "css",
        runtime: "web",
        html: "<h1>Title</h1>\n<p>Hello</p>",
        code: solution,
        starterCode: "/* TODO: make the p text green */\nh1 {\n  color: brown;\n}\n",
      },
      testCriteria: { expectedCode },
    },
    {
      code: "",
      web: {
        html: "<h1>Title</h1>\n<p>Hello</p>",
        css: "/* TODO: make the p text green */\nh1 {\n  color: brown;\n}\n",
        javascript: "",
      },
    },
    { web: true, language: "css" },
  );
  assert.ok(review && "web" in review.answer);
  assert.equal(looksLikeRegexDebris(review.answer.web.css), false);
  assert.match(review.answer.web.css, /color:\s*green/i);
  assert.match(review.answer.web.css, /p\s*\{/);
  assert.doesNotMatch(review.answer.web.css, /\[\^|\\s\*|regex:/i);
});

test("looksLikeRegexDebris catches mangled CSS samples from the compare modal bug", () => {
  assert.equal(looksLikeRegexDebris("p{=:|^} ]*[: ]color:[^; |\\n]+:; ]|!"), true);
  assert.equal(looksLikeReadableSource("p {\n  color: green;\n}"), true);
  assert.equal(looksLikeReadableSource("regex:p\\s*\\{"), false);
});

test("CSS starterCss + css fields are used for the CSS pane review", () => {
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: {
        language: "css",
        runtime: "web",
        html: "<p>Hi</p>",
        css: "p { color: green; }",
        starterCss: "/* TODO */\np {\n\n}\n",
        code: "/* not the css pane */",
      },
      testCriteria: { expectedCode: "regex:color\\s*:\\s*green" },
    },
    { code: "", web: { html: "<p>Hi</p>", css: "p{}", javascript: "" } },
    { web: true, language: "css" },
  );
  assert.ok(review && "web" in review.answer);
  assert.equal(review.answer.web.css, "p { color: green; }");
});

test("regex debris is never returned as a single-file answer", () => {
  const answer = modelMainAnswer({
    language: "python",
    expectedCode: "regex:print\\s*\\(\\s*['\"]hi['\"]\\s*\\)",
    starterCode: "# TODO\n",
    exampleCode: 'print("hi")',
  });
  assert.equal(answer, 'print("hi")');
  assert.equal(looksLikeRegexDebris(answer), false);
});

test("all 17 runner languages + HTML/CSS never show regex debris in View answer", () => {
  const runnerLangs = CODE_RUN_LANGUAGES.map((l) => l.value);
  assert.equal(runnerLangs.length, 17, "CODE_RUN_LANGUAGES should list 17 languages");
  const allLangs = [...runnerLangs, "html", "css"];
  for (const language of allLangs) {
    const solution = REGEX_SAFE_SNIPPETS[language];
    assert.ok(solution, `missing snippet for ${language}`);
    const expectedCode = "regex:ok_marker";
    if (language === "html" || language === "css") {
      const review = buildAnswerReview(
        {
          type: "code_test",
          code_example: {
            language,
            runtime: "web",
            code: solution,
            starterCode: language === "css" ? "/* TODO */\n" : "<!-- TODO -->\n",
            html: language === "html" ? undefined : "<p>Hi</p>",
          },
          testCriteria: { expectedCode },
        },
        {
          code: "",
          web: {
            html: language === "html" ? "<!-- TODO -->" : "<p>Hi</p>",
            css: language === "css" ? "/* TODO */" : "",
            javascript: "",
          },
        },
        { web: true, language },
      );
      assert.ok(review && "web" in review.answer, language);
      const pane = language === "css" ? review.answer.web.css : review.answer.web.html;
      assert.equal(looksLikeRegexDebris(pane), false, language);
      assert.match(pane, /ok_marker/, language);
      assert.doesNotMatch(pane, /^regex:/i, language);
    } else {
      const review = buildAnswerReview(
        {
          type: "code_test",
          code_example: { language, code: solution, starterCode: "// TODO\n" },
          testCriteria: { expectedCode },
        },
        { code: "// TODO" },
        { web: false, language },
      );
      assert.ok(review && "code" in review.answer, language);
      assert.equal(looksLikeRegexDebris(review.answer.code), false, language);
      assert.equal(review.answer.code, solution, language);
    }
  }
});

test("JavaScript course expectedCode lands in the JavaScript pane", () => {
  const review = buildAnswerReview(
    {
      type: "code_test",
      code_example: {
        language: "javascript",
        runtime: "web",
        html: "<button id=\"b\">Go</button>",
        code: "/* demo */",
      },
      testCriteria: {
        expectedCode: 'document.getElementById("b").onclick = () => {};',
      },
    },
    {
      code: "",
      web: {
        html: "<button id=\"b\">Go</button>",
        css: "",
        javascript: "/* wrong */",
      },
    },
    { web: true, language: "javascript" },
  );
  assert.ok(review && "web" in review.answer);
  assert.equal(
    review.answer.web.javascript,
    'document.getElementById("b").onclick = () => {};',
  );
  assert.equal(review.answer.web.html, "<button id=\"b\">Go</button>");
  assert.equal(review.language, "javascript");
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
