/**
 * Curriculum code_test contract — shared by View Answer, grading, and teacher validation.
 *
 * Field meanings (teachers must follow these):
 * - `code_example.code`     → teach DEMO only (may use a different theme)
 * - `code_example.starterCode` → practice skeleton the learner edits
 * - `code_example.solutionCode` → exact answer for “View correct answer” (preferred)
 * - `testCriteria.expectedCode` → grader (plain snippet or `regex:…`, never shown raw)
 * - `testCriteria.expectedHTML|CSS|JS` / `domChecks` → pane / live checks
 */
import { isRegexExpectedCode, matchExpectedCode } from "./codeTestValidation";
import {
  buildAnswerReview,
  looksLikeRegexDebris,
  looksLikeReadableSource,
} from "./answerReview";

export type CodeContractExample = {
  code?: string;
  language?: string;
  runtime?: string;
  starterCode?: string;
  /** Preferred model answer for View correct answer (must pass expectedCode when set). */
  solutionCode?: string;
  html?: string;
  css?: string;
  starterHtml?: string;
  starterCss?: string;
};

export type CodeContractCriteria = {
  expectedCode?: string;
  expectedHTML?: string;
  expectedCSS?: string;
  expectedJS?: string;
  solutionCode?: string;
  domChecks?: Array<Record<string, unknown>>;
  htmlChecks?: Array<Record<string, unknown>>;
  cssChecks?: Array<Record<string, unknown>>;
};

export type CodeContractQuestion = {
  id?: string;
  type?: string;
  question?: string;
  code_example?: CodeContractExample;
  testCriteria?: CodeContractCriteria;
};

export type CodeContractIssue = {
  level: "error" | "warning";
  path: string;
  message: string;
};

const text = (value?: string) => (typeof value === "string" ? value.trim() : "");

function isRegexExpected(expected?: string): boolean {
  const raw = text(expected);
  if (!raw) return false;
  return raw.startsWith("regex:") || isRegexExpectedCode(raw);
}

function passes(code: string, expected: string, language: string): boolean {
  try {
    return matchExpectedCode(code, expected, language);
  } catch {
    return false;
  }
}

/** Authored solution: code_example.solutionCode wins, then testCriteria.solutionCode. */
export function authoredSolutionCode(question: CodeContractQuestion): string {
  return (
    text(question.code_example?.solutionCode) ||
    text(question.testCriteria?.solutionCode) ||
    ""
  );
}

/**
 * Lint one code_test question for View Answer / grading safety.
 * Errors block publish in preview; warnings guide teachers.
 */
export function lintCodeTestQuestion(
  question: CodeContractQuestion,
  path = "code_test",
): CodeContractIssue[] {
  if (question.type && question.type !== "code_test") return [];

  const issues: CodeContractIssue[] = [];
  const example = question.code_example ?? {};
  const criteria = question.testCriteria ?? {};
  const language = (example.language || "javascript").toLowerCase();
  const expected = text(criteria.expectedCode);
  const demo = text(example.code);
  const starter = text(example.starterCode);
  const solution = authoredSolutionCode(question);
  const hasPaneExpected = Boolean(
    text(criteria.expectedHTML) ||
      text(criteria.expectedCSS) ||
      text(criteria.expectedJS),
  );
  const hasDom =
    Boolean(criteria.domChecks?.length) ||
    Boolean(criteria.htmlChecks?.length) ||
    Boolean(criteria.cssChecks?.length);

  if (!expected && !hasPaneExpected && !hasDom && !solution) {
    issues.push({
      level: "warning",
      path,
      message:
        "Add testCriteria.expectedCode (or expectedHTML/CSS/JS, domChecks, or solutionCode) so the app can grade and show an answer.",
    });
  }

  if (solution) {
    if (looksLikeRegexDebris(solution)) {
      issues.push({
        level: "error",
        path: `${path}.solutionCode`,
        message:
          "solutionCode looks like a grading regex. Put the real learner-facing source code here instead.",
      });
    } else if (expected && !passes(solution, expected, language)) {
      issues.push({
        level: "error",
        path: `${path}.solutionCode`,
        message:
          "solutionCode does not pass testCriteria.expectedCode. Fix the solution or the grader so View Answer matches Submit.",
      });
    }
  }

  if (expected && isRegexExpected(expected) && !solution) {
    issues.push({
      level: "warning",
      path: `${path}.testCriteria.expectedCode`,
      message:
        "expectedCode is a regex. Add code_example.solutionCode with the exact practice answer so View Answer never shows regex debris or the wrong demo.",
    });
  }

  if (expected && !isRegexExpected(expected) && looksLikeRegexDebris(expected)) {
    issues.push({
      level: "error",
      path: `${path}.testCriteria.expectedCode`,
      message:
        "expectedCode looks like regex machinery but is missing the regex: prefix. Use plain source, or prefix with regex:.",
    });
  }

  if (starter && demo && expected && !solution) {
    const demoPasses = passes(demo, expected, language);
    if (!demoPasses) {
      issues.push({
        level: "warning",
        path: `${path}.code_example.code`,
        message:
          "Teach demo (code) does not pass expectedCode — that is OK when the practice theme differs, but add solutionCode for the practice answer (starter theme).",
      });
    }
  }

  if (starter && /TODO/i.test(starter) && !solution && expected && isRegexExpected(expected)) {
    issues.push({
      level: "warning",
      path: `${path}.code_example.starterCode`,
      message:
        "Practice starter has TODO comments and a regex grader. Add solutionCode so View Answer can show the finished practice solution on the correct lines.",
    });
  }

  // Soft check: built review must not be regex debris when we can build one.
  try {
    const review = buildAnswerReview(
      {
        type: "code_test",
        code_example: {
          ...example,
          solutionCode: solution || example.solutionCode,
        },
        testCriteria: criteria,
      },
      {
        code: starter || demo || "//",
        web: {
          html: text(example.html) || text(example.starterHtml) || "<p></p>",
          css: text(example.css) || text(example.starterCss) || text(example.starterCode) || "",
          javascript: text(example.starterCode) || text(example.code) || "",
        },
      },
      {
        web: Boolean(
          example.runtime === "web" ||
            language === "html" ||
            language === "css" ||
            language === "javascript" ||
            language === "js",
        ),
        language,
      },
    );
    if (review) {
      const shown =
        "code" in review.answer
          ? review.answer.code
          : language === "css"
            ? review.answer.web.css
            : language === "javascript" || language === "js"
              ? review.answer.web.javascript
              : review.answer.web.html;
      if (shown && looksLikeRegexDebris(shown)) {
        issues.push({
          level: "error",
          path,
          message:
            "View correct answer would show regex debris. Add a plain solutionCode that passes expectedCode.",
        });
      }
      if (shown && expected && !passes(shown, expected, language) && !solution) {
        issues.push({
          level: "warning",
          path,
          message:
            "Built View Answer sample may not pass expectedCode. Add solutionCode to lock the display answer.",
        });
      }
    }
  } catch {
    /* lint stays best-effort */
  }

  return issues;
}

/** Walk a curriculum JSON object and lint every code_test question. */
export function lintCurriculumCodeTests(data: unknown): CodeContractIssue[] {
  const issues: CodeContractIssue[] = [];
  if (!data || typeof data !== "object") return issues;

  const root = data as Record<string, unknown>;
  const curriculum =
    root.curriculum && typeof root.curriculum === "object"
      ? (root.curriculum as Record<string, unknown>)
      : root;

  const modules = Array.isArray(curriculum.modules) ? curriculum.modules : [];
  modules.forEach((mod, mi) => {
    if (!mod || typeof mod !== "object") return;
    const lessons = Array.isArray((mod as { lessons?: unknown }).lessons)
      ? (mod as { lessons: unknown[] }).lessons
      : [];
    lessons.forEach((lesson, li) => {
      if (!lesson || typeof lesson !== "object") return;
      const L = lesson as Record<string, unknown>;
      const questions = Array.isArray(L.questions) ? L.questions : [];
      questions.forEach((q, qi) => {
        if (!q || typeof q !== "object") return;
        const question = q as CodeContractQuestion;
        if (question.type !== "code_test") return;
        const id = question.id || `q${qi + 1}`;
        issues.push(
          ...lintCodeTestQuestion(
            question,
            `modules[${mi}].lessons[${li}].questions[${qi}] (${id})`,
          ),
        );
      });

      // v2 flow beats
      const flow = Array.isArray(L.flow) ? L.flow : [];
      flow.forEach((beat, bi) => {
        if (!beat || typeof beat !== "object") return;
        const B = beat as Record<string, unknown>;
        if (B.type !== "question" || !B.question || typeof B.question !== "object") return;
        const question = B.question as CodeContractQuestion;
        if (question.type !== "code_test") return;
        const id = question.id || String(B.id || `beat${bi + 1}`);
        issues.push(
          ...lintCodeTestQuestion(
            question,
            `modules[${mi}].lessons[${li}].flow[${bi}] (${id})`,
          ),
        );
      });
    });
  });

  return issues;
}

export function partitionCodeContractIssues(issues: CodeContractIssue[]): {
  errors: string[];
  warnings: string[];
} {
  return {
    errors: issues.filter((i) => i.level === "error").map((i) => `${i.path}: ${i.message}`),
    warnings: issues.filter((i) => i.level === "warning").map((i) => `${i.path}: ${i.message}`),
  };
}

export function isReadableSolution(sample: string): boolean {
  return looksLikeReadableSource(sample);
}
