import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWebCodeFromExample,
  defaultWebEditorTab,
  evaluateWebCodeTest,
  mainWebPaneForExample,
  webCodeForExamplePractice,
} from "./webCodeWorkspace.ts";
import { evaluateSubmissionCodeTest } from "./codeTestRunner.ts";
import { isCodeEditorLanguage, normalizeRunLanguage } from "./codeExecution/languages.ts";

test("defaultWebEditorTab follows course language, not runtime alone", () => {
  assert.equal(defaultWebEditorTab("html", "web"), "html");
  assert.equal(defaultWebEditorTab("HTML", "web"), "html");
  assert.equal(defaultWebEditorTab("css", "web"), "css");
  assert.equal(defaultWebEditorTab("javascript", "web"), "javascript");
  assert.equal(defaultWebEditorTab("js", "web"), "javascript");
  // Bare language "web" is the browser workspace (JS tab), not HTML.
  // normalizeRunLanguage("web") → "html" must NOT be passed here.
  assert.equal(defaultWebEditorTab("web", "web"), "javascript");
  assert.equal(defaultWebEditorTab("web"), "javascript");
  // JS web lessons with no language still open on the script pane.
  assert.equal(defaultWebEditorTab(undefined, "web"), "javascript");
  assert.equal(defaultWebEditorTab("html"), "html");
  assert.equal(defaultWebEditorTab(), "html");
});

test("mainWebPaneForExample treats language web as javascript pane", () => {
  assert.equal(
    mainWebPaneForExample({
      code: "console.log(1)",
      language: "web",
      runtime: "web",
      html: "<div id='app'></div>",
    }),
    "javascript",
  );
});

test("main pane for HTML + runtime web is html, not javascript", () => {
  assert.equal(
    mainWebPaneForExample({ code: "<h1>Hi</h1>", language: "html", runtime: "web" }),
    "html",
  );
  assert.equal(
    mainWebPaneForExample({
      code: "document.body",
      language: "javascript",
      runtime: "web",
      html: "<h1>Hi</h1>",
    }),
    "javascript",
  );
});

test("HTML runtime-web examples put code in the HTML pane", () => {
  const demo = buildWebCodeFromExample(
    {
      language: "html",
      runtime: "web",
      code: "<h1 id=\"title\">Hello</h1>",
    },
    "demo",
  );
  assert.equal(demo.html.includes("Hello"), true);
  assert.equal(demo.javascript, "");

  const practice = webCodeForExamplePractice({
    language: "html",
    runtime: "web",
    code: "<h1>Solution</h1>",
    starterCode: "<h1>TODO</h1>",
  });
  assert.equal(practice.html.includes("TODO"), true);
  assert.equal(practice.javascript, "");
});

test("JS web examples still put code in the JavaScript pane with authored HTML/CSS", () => {
  const demo = buildWebCodeFromExample(
    {
      language: "javascript",
      runtime: "web",
      html: "<h1 id=\"t\">Hi</h1>",
      css: "h1{color:red}",
      code: 'document.getElementById("t").textContent = "Hello";',
    },
    "demo",
  );
  assert.equal(demo.html.includes("Hi"), true);
  assert.equal(demo.css.includes("red"), true);
  assert.equal(demo.javascript.includes("Hello"), true);
});

test("submitting HTML from the HTML pane passes expectedHTML", () => {
  const result = evaluateWebCodeTest(
    { html: "<h1>Welcome</h1><p>Learn HTML</p>", css: "", javascript: "" },
    { expectedHTML: "<h1>Welcome</h1>" },
    "html",
  );
  assert.equal(result.passed, true);
});

test("HTML expectedCode is graded with HTML matching, not JS normalization", () => {
  const result = evaluateWebCodeTest(
    {
      html: "<h1 class=\"hero\">Page title</h1>",
      css: "",
      javascript: "",
    },
    { expectedCode: "<h1 class=\"hero\">Page title</h1>" },
    "html",
  );
  assert.equal(result.passed, true);
});

test("full submit path: HTML course with runtime web uses the HTML pane", () => {
  const sources = webCodeForExamplePractice({
    language: "html",
    runtime: "web",
    code: "<img src=\"cat.jpg\" alt=\"A cat\">",
    starterCode: "<img src=\"cat.jpg\">",
  });
  // Learner finishes the alt attribute on the HTML tab.
  sources.html = '<img src="cat.jpg" alt="A cat">';

  const graded = evaluateSubmissionCodeTest(
    {
      code: "",
      language: "html",
      runtime: "web",
      webCode: sources,
    },
    { expectedHTML: 'alt="A cat"' },
  );
  assert.equal(graded.passed, true);

  const wrongTabTrap = evaluateSubmissionCodeTest(
    {
      code: "",
      language: "html",
      runtime: "web",
      webCode: {
        html: "",
        css: "",
        // Old bug: HTML solution was dumped into JS; empty HTML pane must fail expectedHTML.
        javascript: '<img src="cat.jpg" alt="A cat">',
      },
    },
    { expectedHTML: 'alt="A cat"' },
  );
  assert.equal(wrongTabTrap.passed, false);
});

test("JS web lesson with locked HTML still grades expectedJS from the JS pane", () => {
  const graded = evaluateSubmissionCodeTest(
    {
      code: "",
      language: "javascript",
      runtime: "web",
      webCode: {
        html: "<button id=\"btn\">Go</button>",
        css: "",
        javascript: 'document.getElementById("btn").onclick = () => {};',
      },
    },
    { expectedJS: "getElementById" },
  );
  assert.equal(graded.passed, true);
});

test("learner toggles to HTML tab and submits correct markup after wrong-pane seed", () => {
  // Simulate the pre-fix world: starter landed in JS, learner switched tabs and typed HTML.
  const afterToggle: {
    html: string;
    css: string;
    javascript: string;
  } = {
    html: "",
    css: "",
    javascript: "<h1>Starter leftover</h1>",
  };
  afterToggle.html =
    "<!DOCTYPE html><html><head><title>Puppy App</title></head><body><h1>Puppy Picture App</h1><p>A puppy page is coming soon.</p></body></html>";

  const graded = evaluateSubmissionCodeTest(
    {
      code: "",
      language: "html",
      runtime: "web",
      webCode: afterToggle,
    },
    {
      expectedCode:
        "regex:<title>\\s*Puppy App\\s*</title>[\\s\\S]*<h1>\\s*Puppy Picture App\\s*</h1>[\\s\\S]*<p>\\s*A puppy page is coming soon\\.\\s*</p>",
    },
  );
  assert.equal(graded.passed, true);
});

test("puppy-style HTML practice with runtime web seeds starter into HTML pane", () => {
  const starter =
    "<!DOCTYPE html>\n<html>\n  <head>\n    <title></title>\n  </head>\n  <body>\n  </body>\n</html>";
  const sources = webCodeForExamplePractice({
    language: "html",
    runtime: "web",
    code: "<!DOCTYPE html><html><head><title>Puppy App</title></head><body><h1>Puppy Picture App</h1></body></html>",
    starterCode: starter,
  });
  assert.equal(sources.html.includes("<title></title>"), true);
  assert.equal(sources.javascript, "");
  assert.equal(defaultWebEditorTab("html", "web"), "html");
});

test("CSS course with runtime web opens CSS tab and grades CSS pane", () => {
  assert.equal(defaultWebEditorTab("css", "web"), "css");
  const sources = webCodeForExamplePractice({
    language: "css",
    runtime: "web",
    code: "h1 { color: blue; }",
    starterCode: "h1 { color: ; }",
    html: "<h1>Hi</h1>",
  });
  assert.equal(sources.css.includes("color:"), true);
  sources.css = "h1 { color: blue; }";
  const graded = evaluateSubmissionCodeTest(
    {
      code: "",
      language: "css",
      runtime: "web",
      webCode: sources,
    },
    { expectedCSS: "color: blue" },
  );
  assert.equal(graded.passed, true);
});

test("spoken curriculum locale is not treated as a code editor language", () => {
  assert.equal(isCodeEditorLanguage("en"), false);
  assert.equal(isCodeEditorLanguage("fr"), false);
  assert.equal(isCodeEditorLanguage("html"), true);
  assert.equal(isCodeEditorLanguage("css"), true);
  assert.equal(isCodeEditorLanguage("javascript"), true);
  assert.equal(isCodeEditorLanguage("python"), true);
  // Locale "en" must not become the panel language when example language is present.
  const fromExample = normalizeRunLanguage("html");
  assert.equal(fromExample, "html");
  assert.equal(defaultWebEditorTab(fromExample, "web"), "html");
});

test("plain HTML without runtime still seeds and grades the HTML pane", () => {
  const sources = webCodeForExamplePractice({
    language: "html",
    code: "<p>done</p>",
    starterCode: "<p></p>",
  });
  assert.equal(sources.html, "<p></p>");
  sources.html = "<p>done</p>";
  const graded = evaluateSubmissionCodeTest(
    {
      code: "",
      language: "html",
      webCode: sources,
    },
    { expectedHTML: "<p>done</p>" },
  );
  assert.equal(graded.passed, true);
  assert.equal(defaultWebEditorTab("html"), "html");
});
