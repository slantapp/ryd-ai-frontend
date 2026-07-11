import type { CodeTestCriteria, CodeTestResult } from "./codeTestValidation";
import { matchExpectedCode } from "./codeTestValidation";
import { prepareHtmlForPreview } from "./prepareHtmlForPreview";

export type WebCodeSources = {
  html: string;
  css: string;
  javascript: string;
};

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
): boolean {
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

/** Build a runnable HTML document from the three editor panes. */
export function buildWebPreviewDocument(sources: WebCodeSources): string {
  const html = sources.html.trim();
  const css = sources.css.trim();
  const javascript = sources.javascript.trim();

  if (/<html[\s>]/i.test(html)) {
    let document = html;
    if (css && !/<style[\s>]/i.test(document)) {
      document = document.replace(
        /<\/head>/i,
        `<style>\n${css}\n</style>\n</head>`,
      );
    }
    if (javascript && !/<script[\s>]/i.test(document)) {
      document = document.replace(
        /<\/body>/i,
        `<script>\n${javascript}\n</script>\n</body>`,
      );
    }
    return prepareHtmlForPreview(document);
  }

  return prepareHtmlForPreview(`<!DOCTYPE html>
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
<script>
${javascript}
</script>
</body>
</html>`);
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
): { passed: boolean; testResults: CodeTestResult[] } {
  const testResults: CodeTestResult[] = [];
  let passed = false;

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
    passed = matchExpectedCode(combined, criteria.expectedCode);
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

export type WebEditorTab = "html" | "css" | "javascript";

export function defaultWebEditorTab(language?: string): WebEditorTab {
  const lang = (language || "html").toLowerCase().trim();
  if (lang === "css") return "css";
  if (lang === "javascript" || lang === "js") return "javascript";
  return "html";
}
