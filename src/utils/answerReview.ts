/**
 * "View correct answer" after a code question's tries are used up.
 *
 * The learner's code stays in the editor. The stored answer is shown next to it
 * in a side-by-side comparison, and the lesson waits for Continue.
 */
import type { WebCodeSources } from "./webCodeWorkspace";

export type AnswerReviewQuestion = {
  type: string;
  code_example?: {
    code?: string;
    html?: string;
    css?: string;
    language?: string;
  };
  testCriteria?: {
    expectedCode?: string;
    expectedHTML?: string;
    expectedCSS?: string;
    expectedJS?: string;
  };
};

export type AnswerReview = {
  /** Monaco language of a single-file answer (python, cpp…). */
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

/**
 * The answer the author stored, for comparison. Web lessons often keep their model page in
 * `code_example` (html, css, and code for the JavaScript) rather than in `expectedHTML/CSS/JS`,
 * so both are read. Returns null when there is nothing to show.
 */
export function buildAnswerReview(
  question: AnswerReviewQuestion,
  learner: { code: string; web?: WebCodeSources | null },
  options: { web: boolean; language: string },
): AnswerReview | null {
  if (question.type !== "code_test") return null;
  const criteria = question.testCriteria ?? {};
  const example = question.code_example ?? {};
  const regexCode = text(criteria.expectedCode).startsWith("regex:");

  if (options.web) {
    const answer: WebCodeSources = {
      html: text(criteria.expectedHTML) || text(example.html),
      css: text(criteria.expectedCSS) || text(example.css),
      javascript:
        text(criteria.expectedJS) || (regexCode ? "" : text(criteria.expectedCode)) || text(example.code),
    };
    if (!answer.html && !answer.css && !answer.javascript) return null;
    return {
      language: "html",
      learner: { web: learner.web ?? { html: "", css: "", javascript: "" } },
      answer: { web: answer },
    };
  }

  const code = (regexCode ? "" : text(criteria.expectedCode)) || text(example.code);
  if (!code) return null;
  return { language: options.language, learner: { code: learner.code }, answer: { code } };
}
