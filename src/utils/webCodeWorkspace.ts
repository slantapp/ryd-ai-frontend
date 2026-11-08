import type { CodeTestCriteria, CodeTestResult } from "./codeTestValidation";
import { matchExpectedCode } from "./codeTestValidation";
import { prepareHtmlForPreview } from "./prepareHtmlForPreview";
import {
  applyLearnerLineMap,
  LEARNER_SCRIPT_MARKER,
  previewEpilogue,
  previewPreamble,
  type PageCheck,
} from "./webPreviewBridge";

export type WebCodeSources = {
  html: string;
  css: string;
  javascript: string;
};

export type WebEditorTab = "html" | "css" | "javascript";

export const EMPTY_WEB_CODE: WebCodeSources = {
  html: "",
  css: "",
  javascript: "",
};

const WEB_LANGUAGE_VALUES = new Set([
  "html",
  "css",
  "web",
  "html/css",
  "html+css",
  "html-css",
]);

export function isWebWorkspaceLanguage(
  language?: string,
  criteria?: CodeTestCriteria,
  runtime?: string,
): boolean {
  if (runtime === "web") return true;
  const lang = (language || "").toLowerCase().trim();
  if (WEB_LANGUAGE_VALUES.has(lang)) return true;
  if (criteria?.expectedHTML || criteria?.expectedCSS) return true;
  return false;
}

export function seedWebCodeFromExample(
  code: string,
  language?: string,
): WebCodeSources {
  const lang = (language || "html").toLowerCase().trim();
  if (lang === "css") {
    return { html: "", css: code, javascript: "" };
  }
  if (lang === "javascript" || lang === "js") {
    return { html: "", css: "", javascript: code };
  }
  return { html: code, css: "", javascript: "" };
}

/** Infer companion pane language when `supportingLanguage` is omitted. */
export function inferSupportingLanguage(mainLanguage?: string): string {
  const lang = (mainLanguage || "html").toLowerCase().trim();
  if (lang === "css") return "html";
  if (lang === "html" || lang === "web" || lang.startsWith("html")) return "css";
  if (lang === "javascript" || lang === "js") return "html";
  return "html";
}

function mergeWebSources(
  primary: WebCodeSources,
  secondary: WebCodeSources,
): WebCodeSources {
  return {
    html: primary.html || secondary.html,
    css: primary.css || secondary.css,
    javascript: primary.javascript || secondary.javascript,
  };
}

export type WebCodeExampleLike = {
  code: string;
  language: string;
  starterCode?: string;
  supportingCode?: string;
  supportingLanguage?: string;
  runtime?: string;
  html?: string;
  css?: string;
  starterHtml?: string;
  starterCss?: string;
};

export function exampleUsesAuthoredWebPanes(example: WebCodeExampleLike): boolean {
  return (
    example.runtime === "web" ||
    example.html != null ||
    example.css != null ||
    example.starterHtml != null ||
    example.starterCss != null
  );
}

/**
 * Which pane holds the lesson's main `code` / `starterCode`.
 * JS web lessons (`runtime: "web"` + language javascript) keep code in the JS pane;
 * HTML/CSS courses put it in their own pane even when runtime is "web" for the preview.
 */
export function mainWebPaneForExample(example: WebCodeExampleLike): WebEditorTab {
  const lang = (example.language || "").toLowerCase().trim();
  if (lang === "css") return "css";
  if (lang === "html" || lang === "web" || lang.startsWith("html")) return "html";
  if (lang === "javascript" || lang === "js" || example.runtime === "web") {
    return "javascript";
  }
  return "html";
}

/**
 * Build HTML/CSS/JS panes from a code example.
 * - `demo`: main `code` in its language pane + optional companion panes.
 * - `practice`: `starterCode` (or empty) in main pane + companion unchanged.
 * Authored `html` / `css` / `starterHtml` / `starterCss` fill those panes; main code
 * goes to the pane matching `language` (not always JavaScript).
 */
export function buildWebCodeFromExample(
  example: WebCodeExampleLike,
  mode: "demo" | "practice",
): WebCodeSources {
  const mainText =
    mode === "practice"
      ? (example.starterCode?.trim() ?? "")
      : (example.code ?? "");

  if (exampleUsesAuthoredWebPanes(example)) {
    const fieldHtml =
      mode === "practice"
        ? (example.starterHtml ?? example.html ?? "")
        : (example.html ?? "");
    const fieldCss =
      mode === "practice"
        ? (example.starterCss ?? example.css ?? "")
        : (example.css ?? "");
    const mainPane = mainWebPaneForExample(example);

    if (mainPane === "html") {
      return {
        // Prefer an authored HTML field; otherwise the main code is the HTML.
        html: fieldHtml || mainText,
        css: fieldCss,
        // When HTML is authored separately, leftover main text is treated as JS.
        javascript: fieldHtml ? mainText : "",
      };
    }
    if (mainPane === "css") {
      return {
        html: fieldHtml,
        css: fieldCss || mainText,
        javascript: fieldCss ? mainText : "",
      };
    }
    return {
      html: fieldHtml,
      css: fieldCss,
      javascript: mainText,
    };
  }

  const primary = seedWebCodeFromExample(mainText, example.language);

  const supporting = example.supportingCode?.trim();
  if (!supporting) return primary;

  const secondary = seedWebCodeFromExample(
    supporting,
    example.supportingLanguage ?? inferSupportingLanguage(example.language),
  );
  return mergeWebSources(primary, secondary);
}

/** Web workspace while the instructor types the main example (companion panes stay filled). */
export function webCodeForExampleTyping(
  example: WebCodeExampleLike,
  partialMainCode: string,
): WebCodeSources {
  return buildWebCodeFromExample({ ...example, code: partialMainCode }, "demo");
}

/** Web workspace when the student practises (starter in main pane + supporting companion). */
export function webCodeForExamplePractice(
  example: WebCodeExampleLike,
): WebCodeSources {
  return buildWebCodeFromExample(example, "practice");
}

/** Initial web workspace before typing starts (companion prefilled, main pane empty). */
export function webCodeForExampleDemoStart(
  example: WebCodeExampleLike,
): WebCodeSources {
  return buildWebCodeFromExample({ ...example, code: "" }, "demo");
}

export function hasWebCodeContent(sources: WebCodeSources): boolean {
  return Boolean(
    sources.html.trim() || sources.css.trim() || sources.javascript.trim(),
  );
}

function normalizeCodeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/'/g, '"')
    .trim();
}

export type WebPreviewBuildOptions = {
  stdin?: string;
  mocks?: Record<string, unknown>;
  checks?: PageCheck[];
};

function injectPreviewScripts(
  documentHtml: string,
  preamble: string,
  epilogue: string,
): string {
  const pre = `<script>\n${preamble}\n</script>`;
  const post = `<script>\n${epilogue}\n</script>`;
  let next = documentHtml;
  if (/<head[^>]*>/i.test(next)) {
    next = next.replace(/<head[^>]*>/i, (open) => `${open}\n${pre}`);
  } else {
    next = `${pre}\n${next}`;
  }
  if (/<\/body>/i.test(next)) {
    next = next.replace(/<\/body>/i, () => `${post}\n</body>`);
  } else {
    next = `${next}\n${post}`;
  }
  return next;
}

/** Build a runnable HTML document from the three editor panes. */
export function buildWebPreviewDocument(
  sources: WebCodeSources,
  options?: WebPreviewBuildOptions,
): string {
  const html = sources.html.trim();
  const css = sources.css.trim();
  // Leading blank lines stay, so an error line matches the line in the editor.
  const javascript = sources.javascript.trim() ? sources.javascript.replace(/\s+$/, "") : "";
  const preamble = previewPreamble({ stdin: options?.stdin, mocks: options?.mocks });
  const epilogue = previewEpilogue(options?.checks ?? []);

  let documentHtml: string;
  if (/<html[\s>]/i.test(html)) {
    documentHtml = html;
    if (css && !/<style[\s>]/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(
        /<\/head>/i,
        () => `<style>\n${css}\n</style>\n</head>`,
      );
    }
    if (javascript && !/<script[\s>]/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(
        /<\/body>/i,
        () => `<script>\n${LEARNER_SCRIPT_MARKER}\n${javascript}\n</script>\n</body>`,
      );
    }
  } else {
    documentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    ${css}
  </style>
</head>
<body>
${html}
${javascript ? `<script>\n${LEARNER_SCRIPT_MARKER}\n${javascript}\n</script>` : ""}
</body>
</html>`;
  }

  const prepared = prepareHtmlForPreview(injectPreviewScripts(documentHtml, preamble, epilogue));
  const learnerLineCount = javascript ? javascript.split("\n").length : 0;
  return applyLearnerLineMap(prepared, learnerLineCount);
}

export function combineWebCodeForValidation(sources: WebCodeSources): string {
  return [
    sources.html,
    sources.css ? `<style>${sources.css}</style>` : "",
    sources.javascript ? `<script>${sources.javascript}</script>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function evaluateWebCodeTest(
  sources: WebCodeSources,
  criteria: CodeTestCriteria | undefined,
  language?: string,
): { passed: boolean; testResults: CodeTestResult[] } {
  const testResults: CodeTestResult[] = [];
  let passed = false;
  const lang = (language || "").toLowerCase().trim();

  if (criteria?.expectedHTML) {
    const normalizedExpected = normalizeCodeForMatch(criteria.expectedHTML);
    const normalizedCode = normalizeCodeForMatch(sources.html);
    passed = normalizedCode.includes(normalizedExpected);
    testResults.push({
      test: passed
        ? "HTML contains the expected markup"
        : "HTML does not contain the expected markup",
      passed,
      actual: sources.html.trim() || "(empty)",
      expected: criteria.expectedHTML,
    });
  } else if (criteria?.expectedCSS !== undefined) {
    const normalizedExpected = normalizeCodeForMatch(criteria.expectedCSS);
    const normalizedCode = normalizeCodeForMatch(sources.css);
    passed = normalizedCode.includes(normalizedExpected);
    testResults.push({
      test: passed
        ? "CSS contains the expected rules"
        : "CSS does not contain the expected rules",
      passed,
      actual: sources.css.trim() || "(empty)",
      expected: criteria.expectedCSS,
    });
  } else if (criteria?.expectedJS !== undefined) {
    const haystack = sources.javascript.toLowerCase();
    const needle = criteria.expectedJS.toLowerCase();
    passed = haystack.includes(needle);
    testResults.push({
      test: passed
        ? "JavaScript includes the required code"
        : "JavaScript does not include the required code",
      passed,
      actual: sources.javascript.trim() || "(empty)",
      expected: criteria.expectedJS,
    });
  } else if (criteria?.expectedCode) {
    const combined = combineWebCodeForValidation(sources);
    // Match with the lesson language so HTML/CSS answers are not JS-normalized.
    const matchLanguage =
      lang === "css" || lang === "html" || lang === "web" || lang.startsWith("html")
        ? lang === "css"
          ? "css"
          : "html"
        : lang || "html";
    passed = matchExpectedCode(combined, criteria.expectedCode, matchLanguage);
    testResults.push({
      test: passed
        ? "Your code matches the expected solution"
        : "Your code does not match the expected solution",
      passed,
      actual: combined.trim() || "(empty)",
      expected: criteria.expectedCode,
    });
  } else {
    passed = hasWebCodeContent(sources);
    testResults.push({
      test: "At least one of HTML, CSS, or JavaScript is provided",
      passed,
    });
  }

  if (testResults.length === 0) {
    testResults.push({ test: "Code test execution", passed: false });
    passed = false;
  }

  return { passed, testResults };
}

/**
 * Opening tab for the web editor. Language wins over runtime so HTML courses open
 * on HTML even when `runtime: "web"` (preview layout). JS web lessons still open on JS.
 */
export function defaultWebEditorTab(language?: string, runtime?: string): WebEditorTab {
  const lang = (language || "").toLowerCase().trim();
  if (lang === "css") return "css";
  if (lang === "html" || lang === "web" || lang.startsWith("html")) return "html";
  if (lang === "javascript" || lang === "js") return "javascript";
  // No language: JS preview lessons default to the script pane; otherwise HTML.
  if (runtime === "web") return "javascript";
  return "html";
}
