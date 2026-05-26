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
  if (/^[\^]|[$]$/.test(pattern)) return true;
  if (/\.\*|\.\+/.test(pattern)) return true;
  if (/\[[^\]]*\]/.test(pattern)) return true;
  if (/\(\?:/.test(pattern)) return true;
  if (/\\[dswDSWbBfnrt0-9]/.test(pattern)) return true;
  if (/\\[^nrt]/.test(pattern)) return true;
  return false;
}

function normalizeCodeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/'/g, '"')
    .trim();
}

function normalizeExpectedLiteral(value: string): string {
  return value
    .toLowerCase()
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/'/g, '"')
    .trim();
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

  const normalizedCode = normalizeCodeForMatch(code);
  const literal = normalizeExpectedLiteral(pattern);
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
        test: `Array '${criteria.expectedVariable}' matches expected values`,
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
        test: `Variable '${criteria.expectedVariable}' has value '${criteria.expectedValue}'`,
        passed,
        actual: actualValue,
        expected: criteria.expectedValue,
      });
    } else {
      passed = varExists;
      testResults.push({
        test: `Variable '${criteria.expectedVariable}' exists`,
        passed,
      });
    }
  } else if (criteria?.expectedHTML) {
    const normalizedExpected = normalizeCodeForMatch(criteria.expectedHTML);
    const normalizedCode = normalizeCodeForMatch(code);
    passed = normalizedCode.includes(normalizedExpected);
    testResults.push({
      test: `Code contains expected HTML: ${criteria.expectedHTML}`,
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedHTML,
    });
  } else if (criteria?.expectedCSS !== undefined) {
    const normalizedExpected = normalizeCodeForMatch(criteria.expectedCSS);
    const normalizedCode = normalizeCodeForMatch(code);
    passed = normalizedCode.includes(normalizedExpected);
    testResults.push({
      test: `Code contains expected CSS: ${criteria.expectedCSS}`,
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedCSS,
    });
  } else if (criteria?.expectedJS !== undefined) {
    const haystack = code.toLowerCase();
    const needle = criteria.expectedJS.toLowerCase();
    passed = haystack.includes(needle);
    testResults.push({
      test: `Code includes required JavaScript: ${criteria.expectedJS}`,
      passed,
      actual: code.trim() || "(empty)",
      expected: criteria.expectedJS,
    });
  } else if (criteria?.expectedCode) {
    passed = matchExpectedCode(code, criteria.expectedCode);
    testResults.push({
      test: "Code matches the required pattern",
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
        test: `Function '${criteria.expectedFunction}' exists`,
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
  return testResults.map((r) =>
    r.passed
      ? `✅ PASS: ${r.test}`
      : `❌ FAIL: ${r.test}${
          r.actual !== undefined
            ? ` (got: ${JSON.stringify(r.actual)}, expected: ${JSON.stringify(r.expected)})`
            : ""
        }`,
  );
}
