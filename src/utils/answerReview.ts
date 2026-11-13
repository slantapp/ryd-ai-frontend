/**
 * "View correct answer" after a code question's tries are used up.
 *
 * The learner's code stays in the editor. The stored answer is shown next to it
 * in a side-by-side comparison, and the lesson waits for Continue.
 *
 * Rules for the right-hand "correct answer" pane (all languages):
 * - Never show a grading `regex:…` pattern, or a mangled sample of one.
 * - Prefer plain expected code / pane fields, then a starter that already passes,
 *   then a readable sample from the regex, then an example that passes the check.
 */
import { isRegexExpectedCode, matchExpectedCode } from "./codeTestValidation";
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

const HASH_COMMENT_LANGUAGES = new Set(["python", "ruby", "bash", "perl"]);

const C_STYLE_COMMENT_LANGUAGES = new Set([
  "css",
  "javascript",
  "js",
  "typescript",
  "ts",
  "java",
  "c",
  "cpp",
  "c++",
  "csharp",
  "c#",
  "go",
  "rust",
  "kotlin",
  "php",
  "swift",
  "scala",
  "dart",
]);

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

/** Strip practice TODO comments for the course language before matching / display. */
export function stripPracticeComments(source: string, language?: string): string {
  const lang = (language || "").toLowerCase().trim();
  let out = source;
  if (lang === "html" || lang === "web" || lang.startsWith("html")) {
    out = stripHtmlComments(out);
  }
  if (C_STYLE_COMMENT_LANGUAGES.has(lang) || lang === "css") {
    out = out
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
  }
  if (HASH_COMMENT_LANGUAGES.has(lang)) {
    out = out.replace(/^[ \t]*#.*$/gm, "");
  }
  if (lang === "lua") {
    out = out.replace(/^[ \t]*--.*$/gm, "");
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * True when a candidate string still looks like regex machinery — never show these
 * in the compare modal (the bug in the CSS screenshot).
 */
export function looksLikeRegexDebris(sample: string): boolean {
  const s = text(sample);
  if (!s) return true;
  if (/^regex:/i.test(s)) return true;
  if (/\(\?:/.test(s)) return true;
  if (/\[\^/.test(s)) return true;
  if (/\[\\[sSwWdD]/.test(s) || /\\[sSwWdD]/.test(s)) return true;
  if (/\[[\w.#:\-^=|]+\]/.test(s)) return true;
  if (/\{[=:|^]/.test(s)) return true;
  if (/\[\s*\\w/.test(s)) return true;
  // Lots of regex metacharacters relative to length → mangled sample.
  const noise = (s.match(/[\[\]|*+?^$\\]/g) || []).length;
  if (noise >= 4 && noise / Math.max(s.length, 1) > 0.12) return true;
  return false;
}

/** True when the string is safe to show learners as source code. */
export function looksLikeReadableSource(sample: string): boolean {
  const s = text(sample);
  if (!s) return false;
  return !looksLikeRegexDebris(s);
}

function withRegexPrefix(expectedCode: string): string {
  const raw = text(expectedCode);
  return raw.startsWith("regex:") ? raw : `regex:${raw}`;
}

/**
 * Turn a grading `regex:…` pattern into a short readable sample (not for matching).
 * Works for typical HTML layout checks and simple CSS `prop: value` checks.
 * Returns "" when the pattern cannot be turned into believable source.
 */
export function sampleFromExpectedRegex(expectedCode: string): string {
  const raw = text(expectedCode);
  if (!raw.startsWith("regex:") && !isRegexExpectedCode(raw)) return looksLikeReadableSource(raw) ? raw : "";
  let pattern = raw.startsWith("regex:") ? raw.slice("regex:".length) : raw;

  // Pull simple CSS declarations out before the generic scrub (e.g. color:\s*green).
  const cssDecls = Array.from(
    pattern.matchAll(/([a-z-]+)\\s\*:\\s\*([a-z0-9#%()._-]+)/gi),
  ).map((m) => `${m[1]}: ${m[2]};`);
  const cssSelector =
    pattern.match(/(?:^|[^\w-])((?:[#.][\w-]+)|(?:\b(?:h[1-6]|p|div|span|body|html|a|img|ul|li|button)\b))\\s\*\\\{/i)?.[1] ??
    pattern.match(/(?:^|[^\w-])((?:[#.][\w-]+)|(?:\b(?:h[1-6]|p|div|span|body|html|a|img|ul|li|button)\b))\s*\{/i)?.[1] ??
    "";

  pattern = pattern
    .replace(/\(\?:<!--\[\\s\\S\]\*\?-->\\s\*\)\*/g, "")
    .replace(/\(\?:\\s\[\^>\]\*\)\?/g, "")
    .replace(/\[\^>\]\*/g, "")
    .replace(/\[\^<\]\*/g, "")
    .replace(/\[\^}\]\*/g, "")
    .replace(/\[\^;\\|\\n\]\*/g, "")
    .replace(/\[\^;|\n\]\*/g, "")
    .replace(/\[\\s\\S\]\*\?/g, "")
    .replace(/\[\\s\\S\]\*/g, "")
    .replace(/\\s\+/g, " ")
    .replace(/\\s\*/g, "")
    .replace(/\\s/g, " ")
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".")
    .replace(/\\([.()[\]{}|+?])/g, "$1")
    .replace(/[()?]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();

  // Light pretty-print for nested tags: <footer><p>…</p></footer>
  pattern = pattern.replace(/><(?!\/)/g, ">\n  <").replace(/><\/(\w+)/g, ">\n</$1");

  if (looksLikeReadableSource(pattern)) return pattern.trim();

  // CSS fallback: build a tiny rule from extracted declarations.
  if (cssDecls.length) {
    const selector = cssSelector || "p";
    const built = `${selector} {\n  ${cssDecls.join("\n  ")}\n}`;
    if (looksLikeReadableSource(built)) return built;
  }

  return "";
}

function passesExpected(code: string, expected: string, language: string): boolean {
  if (!expected) return Boolean(text(code));
  try {
    return matchExpectedCode(code, expected, language);
  } catch {
    return false;
  }
}

/**
 * Build the main-pane model answer for any course language.
 * Never returns regex debris. Prefer criteria → matching starter → readable sample →
 * matching example → starter skeleton → example.
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
  const language = opts.language || "html";
  const isRegex = Boolean(expected) && (expected.startsWith("regex:") || isRegexExpectedCode(expected));

  if (expected && !isRegex) return expected;

  const cleanedStarter = starter ? stripPracticeComments(starter, language) : "";
  if (cleanedStarter && passesExpected(cleanedStarter, expected, language)) {
    return cleanedStarter;
  }

  const sample =
    isRegex && expected
      ? sampleFromExpectedRegex(withRegexPrefix(expected))
      : "";
  const usableSample = looksLikeReadableSource(sample) ? sample : "";
  const matchingExample =
    example && passesExpected(example, expected, language) ? example : "";

  if (cleanedStarter && usableSample) {
    const merged = `${cleanedStarter}\n${usableSample}`.trim();
    if (passesExpected(merged, expected, language)) {
      // Prefer the authored solution when it also passes (avoids starter + "color:green" scraps).
      if (matchingExample) return matchingExample;
      return merged;
    }
  }
  if (usableSample && passesExpected(usableSample, expected, language)) {
    // Prefer a richer authored example over a tiny token extracted from the regex ("print").
    if (matchingExample && matchingExample.length > usableSample.length + 2) {
      return matchingExample;
    }
    return usableSample;
  }

  // Authored demo / solution that satisfies the grader (Ada won't match a Leo check).
  if (matchingExample) return matchingExample;

  // Readable sample that didn't re-match still beats regex junk (HTML layout samples).
  if (usableSample) return usableSample;

  if (cleanedStarter) return cleanedStarter;
  if (example && looksLikeReadableSource(example)) return example;
  return "";
}

/** Starter + demo source for the pane that the course language grades. */
function paneSources(
  example: NonNullable<AnswerReviewQuestion["code_example"]>,
  pane: keyof WebCodeSources,
): { starter: string; demo: string } {
  if (pane === "css") {
    return {
      starter: text(example.starterCss) || text(example.starterCode),
      demo: text(example.css) || text(example.code),
    };
  }
  if (pane === "javascript") {
    return {
      starter: text(example.starterCode),
      demo: text(example.code),
    };
  }
  return {
    starter: text(example.starterHtml) || text(example.starterCode),
    demo: text(example.html) || text(example.code),
  };
}

/**
 * The answer the author stored, for comparison.
 * Prefers `testCriteria` over the teach demo, puts `expectedCode` in the language pane,
 * and for regex checks builds readable source — never the raw pattern.
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

    const { starter, demo } = paneSources(example, pane);
    const main = modelMainAnswer({
      language,
      expectedCode: criteria.expectedCode,
      starterCode: starter,
      exampleCode: demo,
    });

    if (!answer[pane] && main && looksLikeReadableSource(main)) {
      answer[pane] = main;
    } else if (!answer[pane] && main && !looksLikeReadableSource(main)) {
      // Defensive: never put regex debris into a pane.
      const fallback = demo && looksLikeReadableSource(demo) ? demo : "";
      if (fallback) answer[pane] = fallback;
    }

    // Companion panes: finished authored fields first, then practice starters.
    if (!answer.html) answer.html = text(example.html) || text(example.starterHtml);
    if (!answer.css) answer.css = text(example.css) || text(example.starterCss);
    if (!answer.javascript && pane !== "javascript") answer.javascript = "";

    if (!answer.javascript && pane === "javascript") {
      const js = text(example.code);
      if (js && looksLikeReadableSource(js)) answer.javascript = js;
    }

    // Final safety: strip any pane that still looks like a grading pattern.
    (["html", "css", "javascript"] as const).forEach((key) => {
      if (answer[key] && looksLikeRegexDebris(answer[key])) answer[key] = "";
    });

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
  if (!code || looksLikeRegexDebris(code)) return null;
  return { language, learner: { code: learner.code }, answer: { code } };
}
