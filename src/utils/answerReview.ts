/**
 * "View correct answer" after a code question's tries are used up.
 *
 * The learner's code stays in the editor. The stored answer is shown next to it
 * in a side-by-side comparison, and the lesson waits for Continue.
 */
import { matchExpectedCode } from "./codeTestValidation";
import type { WebCodeSources } from "./webCodeWorkspace";

export type AnswerReviewQuestion = {
  type: string;
  code_example?: {
    code?: string;
    html?: string;
    css?: string;
    language?: string;
    runtime?: string;
    /** Practice skeleton the learner edits — preferred over the demo `code` for reviews. */
    starterCode?: string;
    starterHtml?: string;
    starterCss?: string;
  };
  testCriteria?: {
    expectedCode?: string;
    expectedHTML?: string;
    expectedCSS?: string;
    expectedJS?: string;
  };
};

export type AnswerReview = {
  /** Monaco / editor language of the main answer (python, html, css, javascript…). */
  language: string;
  /** The learner's last submission and the stored answer: one file, or HTML/CSS/JavaScript. */
  learner: { code: string } | { web: WebCodeSources };
  answer: { code: string } | { web: WebCodeSources };
};

/** Spoken by the tutor once the tries are used up and an answer is stored. */
export const ANSWER_REVIEW_SPEECH =
  "Tap View correct answer to see it next to your code. Compare them, then tap Continue when you are ready.";

/** Last console line in the same moment. */
export const ANSWER_REVIEW_CONSOLE_HINT =
  "💡 Tap “View correct answer” to compare it with your code, then tap Continue.";

const text = (value?: string) => (typeof value === "string" ? value.trim() : "");

/** Which web pane holds the lesson's main answer (matches course language). */
export function webAnswerPane(language?: string): keyof WebCodeSources {
  const lang = (language || "").toLowerCase().trim();
  if (lang === "css") return "css";
  if (lang === "javascript" || lang === "js") return "javascript";
  return "html";
}

/** Drop HTML comments (practice TODOs) so the review shows a finished page. */
export function stripHtmlComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Turn a grading `regex:…` pattern into a short readable sample (not for matching).
 * Enough for typical HTML layout checks like `<footer>…Made by Leo…</footer>`.
 */
export function sampleFromExpectedRegex(expectedCode: string): string {
  const raw = text(expectedCode);
  if (!raw.startsWith("regex:")) return raw;
  let pattern = raw.slice("regex:".length);
  pattern = pattern
    .replace(/\(\?:<!--\[\\s\\S\]\*\?-->\\s\*\)\*/g, "")
    .replace(/\(\?:\\s\[\^>\]\*\)\?/g, "")
    .replace(/\[\^>\]\*/g, "")
    .replace(/\[\^<\]\*/g, "")
    .replace(/\[\\s\\S\]\*\?/g, "")
    .replace(/\[\\s\\S\]\*/g, "")
    .replace(/\\s\+/g, " ")
    .replace(/\\s\*/g, "")
    .replace(/\\s/g, " ")
    .replace(/\\\//g, "/")
    .replace(/\\([.()[\]{}|+?])/g, "$1")
    .replace(/[()?]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
  // Light pretty-print for nested tags: <footer><p>…</p></footer>
  pattern = pattern.replace(/><(?!\/)/g, ">\n  <").replace(/><\/(\w+)/g, ">\n</$1");
  return pattern.trim();
}

/**
 * Build the main-pane model answer.
 * Prefers test criteria; when expectedCode is a regex (common for HTML), builds from
 * starterCode + a sample of the regex — never the teach-demo `code` (e.g. Ada vs Leo).
 */
export function modelMainAnswer(opts: {
  language: string;
  expectedCode?: string;
  starterCode?: string;
  exampleCode?: string;
}): string {
  const expected = text(opts.expectedCode);
  const starter = text(opts.starterCode);
  const example = text(opts.exampleCode);
  const isRegex = expected.startsWith("regex:");
  const lang = (opts.language || "").toLowerCase().trim();
  // Regex → sample is for markup checks (HTML/CSS). Tiny JS/Python patterns stay as example code.
  const markupLang =
    lang === "html" || lang === "css" || lang === "web" || lang.startsWith("html");

  if (expected && !isRegex) return expected;

  const sample = isRegex && markupLang ? sampleFromExpectedRegex(expected) : "";
  if (starter) {
    const cleaned = stripHtmlComments(starter);
    if (expected && matchExpectedCode(cleaned, expected, opts.language)) {
      return cleaned;
    }
    if (sample) {
      const merged = cleaned ? `${cleaned}\n${sample}` : sample;
      if (!expected || matchExpectedCode(merged, expected, opts.language)) {
        return merged.trim();
      }
      return sample;
    }
    // Practice skeleton without a usable regex sample — still better than the teach demo.
    if (cleaned) return cleaned;
  }

  if (sample) return sample;
  return example;
}

/**
 * The answer the author stored, for comparison.
 * Prefers `testCriteria` over the teach demo, puts `expectedCode` in the language pane,
 * and for regex checks builds from `starterCode` so practice answers (Leo) are not replaced
 * by the demo (`Ada`).
 */
export function buildAnswerReview(
  question: AnswerReviewQuestion,
  learner: { code: string; web?: WebCodeSources | null },
  options: { web: boolean; language: string },
): AnswerReview | null {
  if (question.type !== "code_test") return null;
  const criteria = question.testCriteria ?? {};
  const example = question.code_example ?? {};
  const language = options.language || example.language || "html";

  if (options.web) {
    const pane = webAnswerPane(language);
    const answer: WebCodeSources = {
      html: text(criteria.expectedHTML),
      css: text(criteria.expectedCSS),
      javascript: text(criteria.expectedJS),
    };

    const main = modelMainAnswer({
      language,
      expectedCode: criteria.expectedCode,
      starterCode: example.starterCode,
      // Only use the demo `code` when there is no practice starter / criteria sample.
      exampleCode: example.code,
    });

    if (!answer[pane] && main) answer[pane] = main;

    // Companion panes from criteria, then authored example fields (not the main demo code).
    if (!answer.html) answer.html = text(example.html) || text(example.starterHtml);
    if (!answer.css) answer.css = text(example.css) || text(example.starterCss);
    if (!answer.javascript && pane !== "javascript") answer.javascript = "";

    // When the main pane is JS and criteria left it empty, modelMainAnswer already ran.
    if (!answer.javascript && pane === "javascript" && !main) {
      answer.javascript = text(example.code);
    }

    if (!answer.html && !answer.css && !answer.javascript) return null;
    return {
      language,
      learner: { web: learner.web ?? { html: "", css: "", javascript: "" } },
      answer: { web: answer },
    };
  }

  const code = modelMainAnswer({
    language,
    expectedCode: criteria.expectedCode,
    starterCode: example.starterCode,
    exampleCode: example.code,
  });
  if (!code) return null;
  return { language, learner: { code: learner.code }, answer: { code } };
}
