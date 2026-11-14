/**
 * Golden fixtures — View Answer + curriculum lint must stay green.
 * Run: npm run test:curriculum
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnswerReview, modelMainAnswer, looksLikeRegexDebris } from "./answerReview";
import {
  lintCodeTestQuestion,
  partitionCodeContractIssues,
} from "./curriculumCodeContract";
import { matchExpectedCode } from "./codeTestValidation";

describe("solutionCode preferred for View Answer", () => {
  it("shows authored solutionCode even when demo theme differs", () => {
    const solution =
      "<header>\n  <h1>Leo's Robots</h1>\n</header>\n<footer>\n  <p>Made by Leo</p>\n</footer>\n";
    const review = buildAnswerReview(
      {
        type: "code_test",
        code_example: {
          code: "<footer><p>Made by Ada, 2026</p></footer>",
          language: "html",
          runtime: "web",
          starterCode:
            "<header>\n  <h1>Leo's Robots</h1>\n</header>\n<!-- TODO: footer -->\n",
          solutionCode: solution,
        },
        testCriteria: {
          expectedCode:
            "regex:<footer(?:\\s[^>]*)?>\\s*<p(?:\\s[^>]*)?>\\s*Made\\s+by\\s+Leo\\s*</p\\s*>\\s*</footer\\s*>",
        },
      },
      { code: "//", web: { html: "", css: "", javascript: "" } },
      { web: true, language: "html" },
    );
    assert.ok(review);
    assert.ok("web" in review!.answer);
    const shown = review!.answer.web.html;
    assert.ok(shown.includes("Leo"));
    assert.ok(!shown.includes("Ada"));
    assert.ok(!looksLikeRegexDebris(shown));
    assert.ok(
      matchExpectedCode(
        shown,
        "regex:<footer(?:\\s[^>]*)?>\\s*<p(?:\\s[^>]*)?>\\s*Made\\s+by\\s+Leo\\s*</p\\s*>\\s*</footer\\s*>",
        "html",
      ),
    );
  });

  it("modelMainAnswer returns solutionCode first", () => {
    const out = modelMainAnswer({
      language: "javascript",
      expectedCode: "regex:fillRect\\s*\\(\\s*100",
      starterCode: "// TODO: draw\n",
      exampleCode: "ctx.fillRect(0, 0, 10, 10);",
      solutionCode: "ctx.fillRect(100, 50, 80, 40);",
    });
    assert.equal(out, "ctx.fillRect(100, 50, 80, 40);");
  });
});

describe("lintCodeTestQuestion", () => {
  it("errors when solutionCode fails expectedCode", () => {
    const issues = lintCodeTestQuestion({
      type: "code_test",
      code_example: {
        code: "let x = 1;",
        language: "javascript",
        solutionCode: "let y = 2;",
      },
      testCriteria: { expectedCode: "let message" },
    });
    const { errors } = partitionCodeContractIssues(issues);
    assert.ok(errors.some((e) => e.includes("does not pass")));
  });

  it("warns when regex expectedCode has no solutionCode", () => {
    const issues = lintCodeTestQuestion({
      type: "code_test",
      code_example: {
        code: "let message = 1;",
        language: "javascript",
        starterCode: "// TODO\n",
      },
      testCriteria: { expectedCode: "regex:let\\s+message" },
    });
    const { warnings, errors } = partitionCodeContractIssues(issues);
    assert.equal(errors.length, 0);
    assert.ok(warnings.some((w) => w.includes("solutionCode")));
  });

  it("accepts matching solutionCode with regex grader", () => {
    const issues = lintCodeTestQuestion({
      type: "code_test",
      code_example: {
        code: "for side in range(3):\n    pen.left(120)",
        language: "python",
        starterCode: "for side in range(4):\n    # TODO\n",
        solutionCode:
          "import turtle\nfor side in range(4):\n    pen.forward(120)\n    pen.left(90)\n",
      },
      testCriteria: {
        expectedCode:
          "regex:for\\s+\\w+\\s+in\\s+range\\s*\\(\\s*4\\s*\\)[\\s\\S]*left\\s*\\(\\s*90\\s*\\)",
      },
    });
    const { errors } = partitionCodeContractIssues(issues);
    assert.equal(errors.length, 0);
  });
});

describe("golden: CSS BEM practice", () => {
  it("solutionCode wins over demo card theme", () => {
    const solution = ".profile {\n  background-color: #1a5fb4;\n}\n";
    const shown = modelMainAnswer({
      language: "css",
      expectedCode: "regex:\\.profile\\s*\\{[\\s\\S]*background-color\\s*:\\s*#1a5fb4",
      starterCode: "/* TODO: .profile background */\n",
      exampleCode: ".card {\n  background-color: red;\n}\n",
      solutionCode: solution,
    });
    assert.equal(shown.trim(), solution.trim());
    assert.ok(!shown.includes(".card"));
  });
});
