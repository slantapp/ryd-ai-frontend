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
export function matchExpectedCode(code: string, expectedCode: string): boolean {
  const pattern = expectedCode.startsWith("regex:")
    ? expectedCode.slice("regex:".length)
    : expectedCode;

  if (isRegexExpectedCode(pattern)) {
    try {
      return new RegExp(pattern, "i").test(code);
    } catch {
      // Fall through to literal matching when the pattern is invalid regex.
    }
  }

  const normalizedCode = normalizeJsCodeForMatch(code);
  const literal = normalizeJsCodeForMatch(pattern);
  return normalizedCode.includes(literal);
}

export function evaluateCodeTest(
  code: string,
  criteria: CodeTestCriteria | undefined,
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
    passed = matchExpectedCode(code, criteria.expectedCode);
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
