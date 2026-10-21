import { resolveGradedLanguage } from "./codeExecution/languages";

export type CodeTestCriteria = {
  expectedVariable?: string;
  expectedValue?: unknown;
  expectedValues?: unknown[];
  expectedFunction?: string;
  expectedHTML?: string;
  expectedCSS?: string;
  expectedJS?: string;
  expectedCode?: string;
  testCases?: Array<{
    input: unknown[];
    expected: unknown;
  }>;
};

export type CodeTestResult = {
  test: string;
  passed: boolean;
  actual?: unknown;
  expected?: unknown;
};

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (
    typeof a === "number" &&
    typeof b === "number" &&
    Number.isNaN(a) &&
    Number.isNaN(b)
  ) {
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/** True when expectedCode was authored as a RegExp pattern (not plain source code). */
export function isRegexExpectedCode(pattern: string): boolean {
  if (pattern.startsWith("regex:")) return true;

  // Multi-line snippets and statement-like code are curriculum answers, not regex.
  if (
    pattern.includes("\n") ||
    /[;{}]/.test(pattern) ||
    /(?:^|\s)(?:let|const|var|for|while|function|if|return)\b/.test(pattern)
  ) {
    return false;
  }

  if (/^[\^].*[$]$/.test(pattern)) return true;
  if (/\.\*|\.\+/.test(pattern)) return true;
  if (/\(\?:/.test(pattern)) return true;
  if (/\\[dswDSWbBfnrt0-9]/.test(pattern)) return true;
  if (/\\[^nrt]/.test(pattern)) return true;
  // Regex character class — but not a JS array literal (arrays contain commas).
  if (/\[[^\]]*\]/.test(pattern) && !/\[[^\]]*,/.test(pattern)) return true;
  return false;
}

function normalizeCodeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/'/g, '"')
    .trim();
}

/**
 * Normalize JavaScript for comparison: ignore line endings, indentation, and
 * brace placement while preserving spaces inside string literals.
 */
function normalizeJsCodeForMatch(value: string): string {
  const strings: string[] = [];
  let s = value.replace(/\r\n/g, "\n");

  const protectString = (match: string) => {
    const token = `__STR${strings.length}__`;
    strings.push(match.toLowerCase().replace(/'/g, '"'));
    return token;
  };

  s = s.replace(/"([^"\\]|\\.)*"/g, protectString);
  s = s.replace(/'([^'\\]|\\.)*'/g, protectString);
  s = s.replace(/`([^`\\]|\\.)*`/g, protectString);

  s = s.toLowerCase().replace(/\\n/g, "\n").replace(/\s+/g, "");

  strings.forEach((literal, index) => {
    s = s.replace(`__STR${index}__`, literal);
  });

  return s;
}

/**
 * Match student code against expectedCode.
 * Plain code snippets (e.g. `if (score > 50)`) use literal substring matching so
 * regex metacharacters like `(`, `+`, and `{` do not cause false failures.
 */
const HASH_COMMENT_LANGUAGES = new Set(["python", "ruby", "bash", "perl"]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripUnquotedMarker(line: string, marker: string): string {
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (quote) {
      if (ch === "\\") {
        index += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (line.startsWith(marker, index)) return line.slice(0, index);
  }
  return line;
}

function stripComments(source: string, language: string): string {
  const hashComments = HASH_COMMENT_LANGUAGES.has(language);
  const withoutBlock = hashComments
    ? source
    : source.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlock
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => stripUnquotedMarker(line, hashComments ? "#" : "//"))
    .join("\n");
}

function compactOutsideStrings(value: string): string {
  let out = "";
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    if (quote) {
      out += ch;
      if (ch === "\\") {
        const next = value[index + 1];
        if (next !== undefined) {
          out += next;
          index += 1;
        }
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      continue;
    }
    if (/\s/.test(ch)) continue;
    out += ch;
  }
  return out;
}

function matchProgramSource(
  code: string,
  expected: string,
  language: string,
): boolean {
  const needle = compactOutsideStrings(stripComments(expected, language));
  if (!needle) return false;
  const haystack = compactOutsideStrings(stripComments(code, language));
  return haystack.includes(needle);
}

function hasIdentifier(code: string, name: string): boolean {
  if (!name.trim()) return false;
  return new RegExp(`\\b${escapeRegExp(name)}\\b`).test(code);
}

function windowHasValue(window: string, form: string): boolean {
  if (!form) return false;
  if (/^-?\d+(?:\.\d+)?$/.test(form)) {
    return new RegExp(`(^|[^\\d.])${escapeRegExp(form)}([^\\d]|$)`).test(window);
  }
  return window.includes(form);
}

function valueAssigned(
  code: string,
  name: string,
  value: unknown,
  language: string,
): boolean {
  if (!hasIdentifier(code, name)) return false;
  const compact = compactOutsideStrings(stripComments(code, language));
  const forms =
    typeof value === "string"
      ? [value, `"${value}"`, `'${value}'`]
      : [String(value)];
  const start = compact.indexOf(name);
  if (start < 0) return false;
  const window = compact.slice(start, start + name.length + 48);
  return forms.some((form) =>
    windowHasValue(window, compactOutsideStrings(form)),
  );
}

function functionDefined(
  code: string,
  name: string,
  language: string,
): boolean {
  const src = stripComments(code, language);
  const n = escapeRegExp(name);
  if (language === "python" || language === "ruby") {
    return new RegExp(`\\bdef\\s+${n}\\b`).test(src);
  }
  if (language === "go") {
    return new RegExp(`\\bfunc\\s+(?:\\([^)]*\\)\\s*)?${n}\\b`).test(src);
  }
  if (language === "rust") return new RegExp(`\\bfn\\s+${n}\\b`).test(src);
  if (language === "kotlin" || language === "scala") {
    return new RegExp(`\\bfun\\s+${n}\\b`).test(src);
  }
  if (language === "swift") return new RegExp(`\\bfunc\\s+${n}\\b`).test(src);
  if (language === "lua" || language === "php" || language === "javascript") {
    return new RegExp(`\\bfunction\\s+${n}\\b`).test(src);
  }
  if (language === "perl") return new RegExp(`\\bsub\\s+${n}\\b`).test(src);
  if (language === "bash") {
    return new RegExp(`(?:\\bfunction\\s+)?${n}\\s*\\(\\s*\\)`).test(src);
  }
  return new RegExp(`\\b${n}\\s*\\([^;{}]*\\)\\s*\\{`).test(src);
}

function formatProbeArg(value: unknown, language: string): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") {
    if (language === "python") return value ? "True" : "False";
    return value ? "true" : "false";
  }
  if (typeof value === "number") return String(value);
  return "null";
}

export function expectedStdout(value: unknown, language: string): string {
  if (typeof value === "boolean") {
    if (language === "python") return value ? "True" : "False";
    return value ? "true" : "false";
  }
  if (value === null) return language === "python" ? "None" : "null";
  return String(value);
}

export function stdoutMatches(
  actual: string,
  expected: unknown,
  language: string,
): boolean {
  if (actual === expectedStdout(expected, language)) return true;
  if (
    typeof expected === "boolean" &&
    (language === "c" || language === "cpp" || language === "java")
  ) {
    return actual === (expected ? "1" : "0");
  }
  return false;
}

/** Extra program that prints each expectedFunction test case. Null when it cannot be built. */
export function buildFunctionProbe(
  code: string,
  criteria: CodeTestCriteria | undefined,
  language: string,
): string | null {
  if (!criteria?.expectedFunction || !criteria.testCases?.length) return null;
  if (/\bmain\s*\(/.test(code)) return null;
  const calls = criteria.testCases.map((testCase) => {
    const args = testCase.input
      .map((value) => formatProbeArg(value, language))
      .join(", ");
    return `${criteria.expectedFunction}(${args})`;
  });
  if (language === "python") {
    return `${code}\n${calls.map((call) => `print(${call})`).join("\n")}\n`;
  }
  if (language === "ruby") {
    return `${code}\n${calls.map((call) => `puts(${call})`).join("\n")}\n`;
  }
  if (language === "lua") {
    return `${code}\n${calls.map((call) => `print(${call})`).join("\n")}\n`;
  }
  if (language === "php" && !code.includes("<?")) {
    return `<?php\n${code}\n${calls.map((call) => `echo ${call}, "\\n";`).join("\n")}\n`;
  }
  if (language === "cpp") {
    const prints = calls
      .map((call) => `std::cout << (${call}) << "\\n";`)
      .join("\n");
    return `#include <iostream>\n${code}\nint main() {\n${prints}\nreturn 0;\n}\n`;
  }
  if (
    language === "c" &&
    criteria.testCases.every((testCase) => typeof testCase.expected === "number")
  ) {
    const prints = calls
      .map((call) => `printf("%g\\n", (double)(${call}));`)
      .join("\n");
    return `#include <stdio.h>\n${code}\nint main(void) {\n${prints}\nreturn 0;\n}\n`;
  }
  return null;
}

function extractStringLiterals(source: string): string[] {
  const literals: string[] = [];
  const pattern = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
  for (const match of source.matchAll(pattern)) {
    try {
      literals.push(JSON.parse(`"${match[0].slice(1, -1).replace(/"/g, '\\"')}"`));
    } catch {
      literals.push(match[0].slice(1, -1));
    }
  }
  return literals;
}

/** True when a finished program printed the text the expected source asks for. */
export function outputAgreesWithExpected(
  runLines: string[] | undefined,
  criteria: CodeTestCriteria | undefined,
): boolean {
  if (!runLines?.length || !criteria) return false;
  if (
    runLines.some(
      (line) => line.startsWith("Error:") || line.startsWith("⚠️"),
    )
  ) {
    return false;
  }
  const stdout = runLines
    .filter((line) => line !== "(No output)")
    .join("\n")
    .trim();
  if (!stdout) return false;
  if (criteria.expectedCode && !criteria.expectedCode.startsWith("regex:")) {
    const literals = extractStringLiterals(criteria.expectedCode)
      .map((literal) => literal.trim())
      .filter(Boolean);
    if (literals.some((literal) => literal === stdout)) return true;
    if (literals.join("\n") === stdout || literals.join("") === stdout) return true;
  }
  if (
    criteria.expectedValue !== undefined &&
    criteria.expectedValue !== null &&
    stdout === String(criteria.expectedValue)
  ) {
    return true;
  }
  return false;
}

export function matchExpectedCode(
  code: string,
  expectedCode: string,
  language = "javascript",
): boolean {
  const explicitRegex = expectedCode.startsWith("regex:");
  const pattern = explicitRegex
    ? expectedCode.slice("regex:".length)
    : expectedCode;

  if (explicitRegex) {
    try {
      return new RegExp(pattern, "i").test(code);
    } catch {
      // Fall through to literal matching when the pattern is invalid regex.
    }
  }

  const lang = language.toLowerCase();
  if (lang === "html" || lang === "css") {
    return normalizeCodeForMatch(code).includes(normalizeCodeForMatch(pattern));
  }
  if (lang === "javascript" || lang === "typescript") {
    const normalizedCode = normalizeJsCodeForMatch(code);
    const literal = normalizeJsCodeForMatch(pattern);
    return normalizedCode.includes(literal);
  }
  return matchProgramSource(code, pattern, lang);
}

function evaluateJavaScriptCodeTest(
  code: string,
  criteria: CodeTestCriteria | undefined,
  language: string,
): { passed: boolean; testResults: CodeTestResult[] } {
  let passed = false;
  const testResults: CodeTestResult[] = [];

  if (criteria?.expectedVariable && criteria.expectedValues) {
    const testCode = `${code}; Array.isArray(${criteria.expectedVariable})`;
    const isArray = eval(testCode) as boolean;
    if (isArray) {
      const actualArray = eval(`${code}; ${criteria.expectedVariable}`);
      passed =
        JSON.stringify(actualArray) === JSON.stringify(criteria.expectedValues);
      testResults.push({
        test: passed
          ? `Array '${criteria.expectedVariable}' matches expected values`
          : `Array '${criteria.expectedVariable}' does not match expected values`,
        passed,
        actual: actualArray,
        expected: criteria.expectedValues,
      });
    }
  } else if (criteria?.expectedVariable) {
    const varExists = eval(
      `${code}; typeof ${criteria.expectedVariable} !== 'undefined'`,
    ) as boolean;
    if (varExists && criteria.expectedValue !== undefined) {
      const actualValue = eval(`${code}; ${criteria.expectedVariable}`);
      passed = valuesEqual(actualValue, criteria.expectedValue);
      testResults.push({
        test: passed
          ? `Variable '${criteria.expectedVariable}' has value '${criteria.expectedValue}'`
          : `Variable '${criteria.expectedVariable}' does not have the expected value`,
        passed,
        actual: actualValue,
        expected: criteria.expectedValue,
      });
    } else {
      passed = varExists;
      testResults.push({
        test: passed
          ? `Variable '${criteria.expectedVariable}' exists`
          : `Variable '${criteria.expectedVariable}' was not found`,
        passed,
      });
    }
  } else if (criteria?.expectedHTML) {
    const normalizedExpected = normalizeCodeForMatch(criteria.expectedHTML);
    const normalizedCode = normalizeCodeForMatch(code);
    passed = normalizedCode.includes(normalizedExpected);
    testResults.push({
      test: passed
        ? "Code contains the expected HTML"
        : "Code does not contain the expected HTML",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedHTML,
    });
  } else if (criteria?.expectedCSS !== undefined) {
    const normalizedExpected = normalizeCodeForMatch(criteria.expectedCSS);
    const normalizedCode = normalizeCodeForMatch(code);
    passed = normalizedCode.includes(normalizedExpected);
    testResults.push({
      test: passed
        ? "Code contains the expected CSS"
        : "Code does not contain the expected CSS",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedCSS,
    });
  } else if (criteria?.expectedJS !== undefined) {
    const haystack = normalizeJsCodeForMatch(code);
    const needle = normalizeJsCodeForMatch(criteria.expectedJS);
    passed = haystack.includes(needle);
    testResults.push({
      test: passed
        ? "Code includes the required JavaScript"
        : "Code does not include the required JavaScript",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedJS,
    });
  } else if (criteria?.expectedCode) {
    passed = matchExpectedCode(code, criteria.expectedCode, language);
    testResults.push({
      test: passed
        ? "Your code matches the expected solution"
        : "Your code does not match the expected solution",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedCode,
    });
  } else if (criteria?.expectedFunction) {
    const funcExists = eval(
      `${code}; typeof ${criteria.expectedFunction} === 'function'`,
    ) as boolean;
    if (!funcExists) {
      testResults.push({
        test: `Function '${criteria.expectedFunction}' was not found`,
        passed: false,
      });
    } else if (criteria.testCases?.length) {
      passed = true;
      criteria.testCases.forEach((testCase, index) => {
        try {
          const funcCall = `${criteria.expectedFunction}(${testCase.input
            .map((v: unknown) =>
              typeof v === "string" ? `"${v}"` : String(v),
            )
            .join(", ")})`;
          const actualResult = eval(`${code}; ${funcCall}`);
          const testPassed = valuesEqual(actualResult, testCase.expected);
          passed = passed && testPassed;
          testResults.push({
            test: `Test case ${index + 1}: ${funcCall} === ${JSON.stringify(
              testCase.expected,
            )}`,
            passed: testPassed,
            actual: actualResult,
            expected: testCase.expected,
          });
        } catch {
          passed = false;
          testResults.push({
            test: `Test case ${index + 1}: Execution error`,
            passed: false,
          });
        }
      });
    } else {
      passed = true;
      testResults.push({
        test: `Function '${criteria.expectedFunction}' exists`,
        passed: true,
      });
    }
  }

  if (testResults.length === 0) {
    testResults.push({ test: "Code test execution", passed: false });
    passed = false;
  }

  return { passed, testResults };
}

function evaluateProgramSourceTest(
  code: string,
  criteria: CodeTestCriteria | undefined,
  language: string,
): { passed: boolean; testResults: CodeTestResult[] } {
  let passed = false;
  const testResults: CodeTestResult[] = [];

  if (criteria?.expectedVariable && criteria.expectedValues) {
    passed =
      hasIdentifier(code, criteria.expectedVariable) &&
      criteria.expectedValues.every((value) =>
        valueAssigned(code, criteria.expectedVariable!, value, language),
      );
    testResults.push({
      test: passed
        ? `Variable '${criteria.expectedVariable}' matches expected values`
        : `Variable '${criteria.expectedVariable}' does not match expected values`,
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedValues,
    });
  } else if (criteria?.expectedVariable) {
    passed =
      criteria.expectedValue !== undefined
        ? valueAssigned(code, criteria.expectedVariable, criteria.expectedValue, language)
        : hasIdentifier(code, criteria.expectedVariable);
    testResults.push({
      test: passed
        ? `Variable '${criteria.expectedVariable}' matches the expected answer`
        : `Variable '${criteria.expectedVariable}' does not match the expected answer`,
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedValue,
    });
  } else if (criteria?.expectedHTML) {
    passed = matchExpectedCode(code, criteria.expectedHTML, "html");
    testResults.push({
      test: passed
        ? "Code contains the expected HTML"
        : "Code does not contain the expected HTML",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedHTML,
    });
  } else if (criteria?.expectedCSS !== undefined) {
    passed = matchExpectedCode(code, criteria.expectedCSS, "css");
    testResults.push({
      test: passed
        ? "Code contains the expected CSS"
        : "Code does not contain the expected CSS",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedCSS,
    });
  } else if (criteria?.expectedJS !== undefined) {
    passed = matchExpectedCode(code, criteria.expectedJS, "javascript");
    testResults.push({
      test: passed
        ? "Code includes the required JavaScript"
        : "Code does not include the required JavaScript",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedJS,
    });
  } else if (criteria?.expectedCode) {
    passed = matchExpectedCode(code, criteria.expectedCode, language);
    testResults.push({
      test: passed
        ? "Your code matches the expected solution"
        : "Your code does not match the expected solution",
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedCode,
    });
  } else if (criteria?.expectedFunction) {
    const defined = functionDefined(code, criteria.expectedFunction, language);
    if (!defined) {
      testResults.push({
        test: `Function '${criteria.expectedFunction}' was not found`,
        passed: false,
      });
    } else if (criteria.testCases?.length) {
      testResults.push({
        test: `Function '${criteria.expectedFunction}' did not pass its test cases`,
        passed: false,
      });
    } else {
      passed = true;
      testResults.push({
        test: `Function '${criteria.expectedFunction}' exists`,
        passed: true,
      });
    }
  }

  if (testResults.length === 0) {
    testResults.push({ test: "Code test execution", passed: false });
    passed = false;
  }

  return { passed, testResults };
}

export function evaluateCodeTest(
  code: string,
  criteria: CodeTestCriteria | undefined,
  language?: string,
): { passed: boolean; testResults: CodeTestResult[] } {
  const graded =
    language === undefined || !language.trim()
      ? "javascript"
      : resolveGradedLanguage(language);
  if (!graded) {
    return {
      passed: false,
      testResults: [
        {
          test: `Cannot check answers for "${language}".`,
          passed: false,
        },
      ],
    };
  }
  if (graded !== "javascript" && graded !== "html" && graded !== "css") {
    return evaluateProgramSourceTest(code, criteria, graded);
  }
  try {
    return evaluateJavaScriptCodeTest(code, criteria, graded);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      testResults: [
        {
          test: `Could not check this answer (${message})`,
          passed: false,
        },
      ],
    };
  }
}

export function formatCodeTestResults(testResults: CodeTestResult[]): string[] {
  return testResults.map((r) => {
    if (r.passed) {
      return `✅ PASS: ${r.test}`;
    }

    // Avoid dumping huge HTML solutions into the console on failure.
    const actual =
      r.actual !== undefined ? truncateForConsole(String(serializeValue(r.actual))) : undefined;
    const expected =
      r.expected !== undefined
        ? truncateForConsole(String(serializeValue(r.expected)))
        : undefined;
    const detail =
      actual !== undefined
        ? ` (got: ${actual}${expected !== undefined ? `, expected: ${expected}` : ""})`
        : "";

    return `❌ FAIL: ${r.test}${detail}`;
  });
}

function serializeValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncateForConsole(value: string, max = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}
